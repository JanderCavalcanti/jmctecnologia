// Mini CRM da Área do cliente: status das propostas no Supabase (Postgres).
// Cliente vê só as propostas ligadas ao próprio e-mail; administradores (tabela "admins")
// cadastram propostas e mudam a etapa. Quem garante isso são as regras em supabase/schema.sql.
import { pedirCadastro } from './cadastro.js';

export const ETAPAS = [
  { chave: 'proposta', nome: 'Proposta comercial', status: 'Proposta comercial em análise' },
  { chave: 'nda', nome: 'NDA', status: 'NDA em andamento' },
  { chave: 'contrato', nome: 'Contrato assinado', status: 'Contrato assinado' },
];

const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => (k === 'class' ? (n.className = v) : n.setAttribute(k, v)));
  filhos.flat().forEach((f) => f != null && n.append(f));
  return n;
};

const formatarData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

// Linha do tempo Proposta comercial -> NDA -> Contrato assinado
function pipeline(p) {
  const atual = Math.min(Math.max(Number(p.etapa) || 0, 0), ETAPAS.length - 1);
  const fim = atual === ETAPAS.length - 1;
  return el('ol', { class: 'pipeline', 'aria-label': 'Etapas da proposta' },
    ETAPAS.map((e, i) => {
      const estado = i < atual || (fim && i === atual) ? 'feita' : i === atual ? 'atual' : 'pendente';
      const data = formatarData(p[`data_${e.chave}`]);
      return el('li', { class: `etapa etapa-${estado}`, ...(estado === 'atual' ? { 'aria-current': 'step' } : {}) },
        el('span', { class: 'etapa-marca', 'aria-hidden': 'true' }, estado === 'feita' ? '✓' : String(i + 1)),
        el('span', { class: 'etapa-nome' }, e.nome),
        el('span', { class: 'etapa-data' }, data || (estado === 'pendente' ? 'A seguir' : '')));
    }));
}

function cartaoProposta(p, extra) {
  const atual = ETAPAS[Math.min(Number(p.etapa) || 0, ETAPAS.length - 1)];
  return el('article', { class: 'proposta' },
    el('div', { class: 'proposta-topo' },
      el('div', {},
        el('h4', {}, p.titulo || 'Proposta'),
        el('p', { class: 'proposta-sub' }, [p.empresa, extra ? p.cliente_email : null].filter(Boolean).join(' · '))),
      el('span', { class: `status-pill${atual.chave === 'contrato' ? ' status-ok' : ''}` }, atual.status)),
    pipeline(p),
    p.observacao ? el('p', { class: 'proposta-obs' }, p.observacao) : null,
    extra || null);
}

let parar = [];

export function pararCRM() {
  parar.forEach((fn) => fn());
  parar = [];
}

// Lista as propostas visíveis para quem está logado e refaz a lista a cada mudança no banco.
function acompanharPropostas(sb, aoMudar, aoErrar) {
  const carregar = async () => {
    const { data, error } = await sb.from('propostas').select('*').order('atualizado_em', { ascending: false });
    if (error) return aoErrar(error);
    aoMudar(data);
  };
  carregar();
  const canal = sb.channel(`propostas-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'propostas' }, carregar)
    .subscribe();
  parar.push(() => sb.removeChannel(canal));
}

export async function iniciarCRM(sb, user) {
  pararCRM();
  const area = document.getElementById('crm');
  const lista = document.getElementById('crm-list');
  const msg = document.getElementById('crm-msg');
  const admin = document.getElementById('crm-admin');
  const painel = document.getElementById('client-panel');
  const meusDados = document.getElementById('meus-dados');

  const { data: adm, error: erroAdm } = await sb.from('admins').select('email').maybeSingle();
  if (erroAdm) throw erroAdm;
  const ehAdmin = !!adm;
  admin.hidden = !ehAdmin;
  area.hidden = ehAdmin;
  meusDados.hidden = ehAdmin;
  if (ehAdmin) {
    painel.hidden = false;
    return iniciarAdmin(sb);
  }

  // Primeiro acesso: o cliente preenche o cadastro antes de ver o painel.
  const { data: existente, error } = await sb.from('clientes').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  let cadastro = existente || (await pedirCadastro(sb, user, null));
  painel.hidden = false;

  const editar = async () => {
    painel.hidden = true;
    cadastro = (await pedirCadastro(sb, user, cadastro)) || cadastro;
    painel.hidden = false;
  };
  meusDados.addEventListener('click', editar);
  parar.push(() => meusDados.removeEventListener('click', editar));

  msg.textContent = 'Carregando suas propostas...';
  acompanharPropostas(sb, (props) => {
    lista.replaceChildren(...props.map((p) => cartaoProposta(p)));
    msg.textContent = props.length ? '' : 'Ainda não há propostas ligadas a este e-mail. Se você já recebeu uma proposta da JMC, fale com a gente pelo WhatsApp.';
  }, (err) => {
    console.error(err);
    msg.textContent = 'Não foi possível carregar suas propostas agora. Tente novamente em instantes.';
  });
}

function iniciarAdmin(sb) {
  const form = document.getElementById('crm-form');
  const formMsg = document.getElementById('crm-form-msg');
  const lista = document.getElementById('crm-admin-list');
  const vazio = document.getElementById('crm-admin-msg');

  const aoEnviar = async (ev) => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(form));
    const clienteEmail = String(dados.clienteEmail || '').trim().toLowerCase();
    if (!clienteEmail || !dados.titulo.trim()) {
      formMsg.textContent = 'Informe o e-mail do cliente e o título da proposta.';
      return;
    }
    form.querySelector('button').disabled = true;
    const { error } = await sb.from('propostas').insert({
      cliente_email: clienteEmail,
      empresa: dados.empresa.trim(),
      titulo: dados.titulo.trim(),
      observacao: dados.observacao.trim(),
    });
    form.querySelector('button').disabled = false;
    if (error) {
      console.error(error);
      formMsg.textContent = 'Não foi possível salvar. Confira se o seu e-mail está na tabela "admins".';
      return;
    }
    form.reset();
    formMsg.textContent = 'Proposta cadastrada. O cliente já vê o status ao entrar com esse e-mail.';
  };
  form.addEventListener('submit', aoEnviar);
  parar.push(() => form.removeEventListener('submit', aoEnviar));

  // As datas de cada etapa são registradas pelo próprio banco (gatilho em supabase/schema.sql).
  const controles = (p) => {
    const select = el('select', { 'aria-label': 'Etapa da proposta' },
      ETAPAS.map((e, i) => {
        const o = el('option', { value: String(i) }, e.nome);
        if (i === (Number(p.etapa) || 0)) o.selected = true;
        return o;
      }));
    select.addEventListener('change', async () => {
      const { error } = await sb.from('propostas').update({ etapa: Number(select.value) }).eq('id', p.id);
      if (error) {
        console.error(error);
        alert('Não foi possível mudar a etapa.');
      }
    });
    const excluir = el('button', { type: 'button', class: 'btn btn-sm btn-ghost' }, 'Excluir');
    excluir.addEventListener('click', async () => {
      if (!confirm(`Excluir a proposta "${p.titulo}"? O cliente deixa de vê-la.`)) return;
      const { error } = await sb.from('propostas').delete().eq('id', p.id);
      if (error) console.error(error);
    });
    return el('div', { class: 'proposta-admin' }, el('label', {}, 'Etapa ', select), excluir);
  };

  vazio.textContent = 'Carregando propostas...';
  acompanharPropostas(sb, (props) => {
    lista.replaceChildren(...props.map((p) => cartaoProposta(p, controles(p))));
    vazio.textContent = props.length ? '' : 'Nenhuma proposta cadastrada ainda.';
  }, (err) => {
    console.error(err);
    vazio.textContent = 'Não foi possível carregar as propostas.';
  });
}
