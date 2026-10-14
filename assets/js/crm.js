// Mini CRM da Área do cliente: status das propostas no Cloud Firestore.
// Cliente vê só as propostas ligadas ao próprio e-mail; administradores (coleção "admins")
// cadastram propostas e mudam a etapa. Quem garante isso são as regras em docs/firestore.rules.

export const ETAPAS = [
  { chave: 'proposta', nome: 'Proposta comercial', status: 'Proposta comercial em análise' },
  { chave: 'nda', nome: 'NDA', status: 'NDA em andamento' },
  { chave: 'contrato', nome: 'Contrato assinado', status: 'Contrato assinado' },
];

import { pedirCadastro } from './cadastro.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => (k === 'class' ? (n.className = v) : n.setAttribute(k, v)));
  filhos.flat().forEach((f) => f != null && n.append(f));
  return n;
};

const formatarData = (ts) =>
  ts && ts.toDate ? ts.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

const ordenar = (lista) =>
  lista.sort((a, b) => (b.atualizadoEm?.toMillis?.() || 0) - (a.atualizadoEm?.toMillis?.() || 0));

// Linha do tempo Proposta comercial -> NDA -> Contrato assinado
function pipeline(p) {
  const atual = Math.min(Math.max(Number(p.etapa) || 0, 0), ETAPAS.length - 1);
  const fim = atual === ETAPAS.length - 1;
  return el('ol', { class: 'pipeline', 'aria-label': 'Etapas da proposta' },
    ETAPAS.map((e, i) => {
      const estado = i < atual || (fim && i === atual) ? 'feita' : i === atual ? 'atual' : 'pendente';
      const data = formatarData(p.datas?.[e.chave]);
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
        el('p', { class: 'proposta-sub' }, [p.empresa, p.clienteEmail && extra ? p.clienteEmail : null].filter(Boolean).join(' · '))),
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

export async function iniciarCRM(app, user) {
  pararCRM();
  const fs = await import(`${SDK}/firebase-firestore.js`);
  const db = fs.getFirestore(app);
  const email = (user.email || '').toLowerCase();

  const area = document.getElementById('crm');
  const lista = document.getElementById('crm-list');
  const msg = document.getElementById('crm-msg');
  const admin = document.getElementById('crm-admin');

  let ehAdmin = false;
  try {
    ehAdmin = email && (await fs.getDoc(fs.doc(db, 'admins', email))).exists();
  } catch (err) {
    console.warn('Verificação de administrador:', err.code || err);
  }
  admin.hidden = !ehAdmin;
  area.hidden = ehAdmin;
  const painel = document.getElementById('client-panel');
  const meusDados = document.getElementById('meus-dados');
  meusDados.hidden = ehAdmin;
  if (ehAdmin) {
    painel.hidden = false;
    return iniciarAdmin(fs, db);
  }

  // Primeiro acesso: o cliente preenche o cadastro antes de ver o painel.
  const ref = fs.doc(db, 'clientes', user.uid);
  let cadastro = (await fs.getDoc(ref)).data();
  if (!cadastro) cadastro = await pedirCadastro(fs, db, user, null);
  painel.hidden = false;

  const editar = async () => {
    painel.hidden = true;
    cadastro = (await pedirCadastro(fs, db, user, cadastro)) || cadastro;
    painel.hidden = false;
  };
  meusDados.addEventListener('click', editar);
  parar.push(() => meusDados.removeEventListener('click', editar));

  msg.textContent = 'Carregando suas propostas...';
  const q = fs.query(fs.collection(db, 'propostas'), fs.where('clienteEmail', '==', email));
  parar.push(fs.onSnapshot(q, (snap) => {
    const props = ordenar(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    lista.replaceChildren(...props.map((p) => cartaoProposta(p)));
    msg.textContent = props.length ? '' : 'Ainda não há propostas ligadas a este e-mail. Se você já recebeu uma proposta da JMC, fale com a gente pelo WhatsApp.';
  }, (err) => {
    console.error(err);
    msg.textContent = 'Não foi possível carregar suas propostas agora. Tente novamente em instantes.';
  }));
}

function iniciarAdmin(fs, db) {
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
    try {
      await fs.addDoc(fs.collection(db, 'propostas'), {
        clienteEmail,
        empresa: dados.empresa.trim(),
        titulo: dados.titulo.trim(),
        observacao: dados.observacao.trim(),
        etapa: 0,
        datas: { proposta: fs.serverTimestamp() },
        criadoEm: fs.serverTimestamp(),
        atualizadoEm: fs.serverTimestamp(),
      });
      form.reset();
      formMsg.textContent = 'Proposta cadastrada. O cliente já vê o status ao entrar com esse e-mail.';
    } catch (err) {
      console.error(err);
      formMsg.textContent = 'Não foi possível salvar. Confira se o seu e-mail está na coleção "admins".';
    } finally {
      form.querySelector('button').disabled = false;
    }
  };
  form.addEventListener('submit', aoEnviar);
  parar.push(() => form.removeEventListener('submit', aoEnviar));

  const mudarEtapa = (p, nova) => {
    const datas = {};
    ETAPAS.forEach((e, i) => {
      if (i <= nova) datas[`datas.${e.chave}`] = p.datas?.[e.chave] || fs.serverTimestamp();
      else datas[`datas.${e.chave}`] = fs.deleteField();
    });
    return fs.updateDoc(fs.doc(db, 'propostas', p.id), { etapa: nova, ...datas, atualizadoEm: fs.serverTimestamp() });
  };

  const controles = (p) => {
    const select = el('select', { 'aria-label': 'Etapa da proposta' },
      ETAPAS.map((e, i) => {
        const o = el('option', { value: String(i) }, e.nome);
        if (i === (Number(p.etapa) || 0)) o.selected = true;
        return o;
      }));
    select.addEventListener('change', () => mudarEtapa(p, Number(select.value)).catch((err) => {
      console.error(err);
      alert('Não foi possível mudar a etapa.');
    }));
    const excluir = el('button', { type: 'button', class: 'btn btn-sm btn-ghost' }, 'Excluir');
    excluir.addEventListener('click', () => {
      if (confirm(`Excluir a proposta "${p.titulo}"? O cliente deixa de vê-la.`)) {
        fs.deleteDoc(fs.doc(db, 'propostas', p.id)).catch((err) => console.error(err));
      }
    });
    return el('div', { class: 'proposta-admin' }, el('label', {}, 'Etapa ', select), excluir);
  };

  vazio.textContent = 'Carregando propostas...';
  parar.push(fs.onSnapshot(fs.collection(db, 'propostas'), (snap) => {
    const props = ordenar(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    lista.replaceChildren(...props.map((p) => cartaoProposta(p, controles(p))));
    vazio.textContent = props.length ? '' : 'Nenhuma proposta cadastrada ainda.';
  }, (err) => {
    console.error(err);
    vazio.textContent = 'Não foi possível carregar as propostas.';
  }));
}
