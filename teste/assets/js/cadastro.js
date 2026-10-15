// Cadastro do cliente no primeiro acesso: CPF/CNPJ, nome ou razão social, endereço pelo CEP e telefone.
// Os dados ficam na tabela clientes do Supabase (regras em supabase/schema.sql).

const digitos = (v) => String(v || '').replace(/\D/g, '');

function aplicarMascara(v, padrao) {
  let i = 0;
  let out = '';
  for (const c of padrao) {
    if (i >= v.length) break;
    out += c === '0' ? v[i++] : c;
  }
  return out;
}

export const mascaraDocumento = (v) => {
  const d = digitos(v).slice(0, 14);
  return d.length <= 11 ? aplicarMascara(d, '000.000.000-00') : aplicarMascara(d, '00.000.000/0000-00');
};
export const mascaraCep = (v) => aplicarMascara(digitos(v).slice(0, 8), '00000-000');
export const mascaraTelefone = (v) => {
  const d = digitos(v).slice(0, 11);
  return d.length <= 10 ? aplicarMascara(d, '(00) 0000-0000') : aplicarMascara(d, '(00) 00000-0000');
};

export function cpfValido(v) {
  const d = digitos(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(v) {
  const d = digitos(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

// Senha da conta com e-mail: mínimo de 8 caracteres, com letras e números (o Supabase confere de novo).
export const senhaValida = (s) => s.length >= 8 && /[a-z]/i.test(s) && /\d/.test(s);
export function forcaSenha(s) {
  if (!s) return 0;
  let n = 0;
  if (s.length >= 8) n++;
  if (/[a-z]/i.test(s) && /\d/.test(s)) n++;
  if (s.length >= 12) n++;
  if (/[^a-z0-9]/i.test(s) || (/[a-z]/.test(s) && /[A-Z]/.test(s))) n++;
  return n;
}

// Quem criou a conta com e-mail já mandou o cadastro junto (user_metadata.cadastro):
// no primeiro acesso depois da confirmação, ele vai direto para a tabela clientes.
export async function salvarCadastroPendente(sb, user) {
  const pendente = user.user_metadata?.cadastro;
  if (!pendente) return null;
  const novo = { ...pendente, email: (user.email || '').toLowerCase() };
  const { error } = await sb.from('clientes').upsert({ id: user.id, ...novo });
  if (error) {
    console.error(error);
    return null;
  }
  return novo;
}

// Mostra o formulário e resolve quando o cliente salvar. "dados" preenche o formulário.
// opcoes.novaConta = { email }: criação de conta com e-mail e senha (sem login ainda).
// opcoes.primeiroAcesso: sem botão Cancelar, mesmo com dados pré-preenchidos.
export function pedirCadastro(sb, user, dados, opcoes = {}) {
  const { novaConta = null, primeiroAcesso = false } = opcoes;
  const box = document.getElementById('cadastro-box');
  const form = document.getElementById('cadastro-form');
  const msg = document.getElementById('cadastro-msg');
  const cancelar = document.getElementById('cadastro-cancelar');
  const campo = (nome) => form.elements[nome];
  const labelNome = document.getElementById('cadastro-nome-label');
  const acesso = document.getElementById('cadastro-acesso');
  const intro = document.getElementById('cadastro-intro');
  const enviar = document.getElementById('cadastro-enviar');
  const forca = [...document.querySelectorAll('#cad-forca i')];
  const confere = document.getElementById('cad-confere');

  form.reset();
  msg.textContent = '';
  msg.className = 'form-msg';
  form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
  if (dados) {
    campo('documento').value = mascaraDocumento(dados.documento);
    campo('telefone').value = mascaraTelefone(dados.telefone);
    campo('cep').value = mascaraCep(dados.cep);
    ['nome', 'contato', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].forEach((k) => (campo(k).value = dados[k] || ''));
  } else if (user) {
    // Prévia vinda da conta Google; o cliente pode trocar.
    campo('contato').value = user.user_metadata?.full_name || user.user_metadata?.name || '';
  }
  cancelar.hidden = !novaConta && (!dados || primeiroAcesso);
  acesso.hidden = !novaConta;
  acesso.disabled = !novaConta;
  if (novaConta) campo('email').value = novaConta.email || '';
  intro.textContent = novaConta
    ? 'Precisamos destes dados para preparar propostas e contratos. Crie também a senha que você vai usar para entrar.'
    : 'Precisamos destes dados para preparar propostas e contratos. Você só preenche uma vez e pode editar depois.';
  enviar.textContent = novaConta ? 'Criar conta' : 'Salvar e continuar';
  const mostrarSenha = () => {
    if (!novaConta) return;
    const s1 = campo('senha').value;
    const s2 = campo('senha2').value;
    const n = forcaSenha(s1);
    forca.forEach((i, k) => i.classList.toggle('on', k < n));
    confere.className = s2 ? (s1 === s2 ? 'dica ok' : 'dica erro') : 'dica';
    confere.textContent = s2 ? (s1 === s2 ? '✓ As senhas conferem' : 'As senhas não conferem') : '';
  };
  mostrarSenha();

  const atualizarNome = () => {
    const n = digitos(campo('documento').value).length;
    labelNome.textContent = n > 11 ? 'Razão social' : n === 11 ? 'Nome completo' : 'Nome completo ou razão social';
  };
  atualizarNome();

  const ultimoCep = { valor: digitos(dados?.cep) };
  const buscarCep = async () => {
    const cep = digitos(campo('cep').value);
    if (cep.length !== 8 || cep === ultimoCep.valor) return;
    ultimoCep.valor = cep;
    msg.textContent = 'Buscando endereço...';
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const end = await r.json();
      if (end.erro) throw new Error('CEP não encontrado');
      campo('logradouro').value = end.logradouro || '';
      campo('bairro').value = end.bairro || '';
      campo('cidade').value = end.localidade || '';
      campo('uf').value = end.uf || '';
      ['logradouro', 'bairro', 'cidade', 'uf'].forEach((k) => campo(k).value && campo(k).removeAttribute('aria-invalid'));
      msg.textContent = '';
      (end.logradouro ? campo('numero') : campo('logradouro')).focus();
    } catch (err) {
      console.warn(err);
      msg.textContent = 'Não encontramos esse CEP. Confira o número ou preencha o endereço manualmente.';
    }
  };

  const mascaras = {
    documento: mascaraDocumento,
    cep: mascaraCep,
    telefone: mascaraTelefone,
  };
  const aoDigitar = (ev) => {
    const m = mascaras[ev.target.name];
    if (m) ev.target.value = m(ev.target.value);
    if (ev.target.name === 'uf') ev.target.value = ev.target.value.replace(/[^a-z]/gi, '').toUpperCase();
    ev.target.removeAttribute('aria-invalid');
    if (ev.target.name === 'documento') atualizarNome();
    if (ev.target.name === 'cep') buscarCep();
    if (ev.target.name === 'senha' || ev.target.name === 'senha2') mostrarSenha();
  };

  return new Promise((resolve) => {
    const validar = () => {
      const erros = [];
      const marcar = (nome, texto) => {
        campo(nome).setAttribute('aria-invalid', 'true');
        erros.push(texto);
      };
      const doc = digitos(campo('documento').value);
      if (doc.length === 11 ? !cpfValido(doc) : doc.length === 14 ? !cnpjValido(doc) : true) marcar('documento', 'CPF ou CNPJ inválido');
      if (campo('nome').value.trim().length < 3) marcar('nome', doc.length === 14 ? 'informe a razão social' : 'informe o nome completo');
      if (campo('contato').value.trim().length < 2) marcar('contato', 'informe o nome para contato');
      if (digitos(campo('cep').value).length !== 8) marcar('cep', 'CEP incompleto');
      ['logradouro', 'numero', 'bairro', 'cidade'].forEach((k) => {
        if (!campo(k).value.trim()) marcar(k, `preencha ${campo(k).dataset.nome}`);
      });
      if (!/^[A-Z]{2}$/.test(campo('uf').value)) marcar('uf', 'estado (UF) inválido');
      const tel = digitos(campo('telefone').value);
      if (tel.length < 10) marcar('telefone', 'telefone incompleto');
      if (novaConta) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo('email').value.trim())) marcar('email', 'e-mail inválido');
        if (!senhaValida(campo('senha').value)) marcar('senha', 'a senha precisa ter 8 caracteres, com letras e números');
        else if (campo('senha').value !== campo('senha2').value) marcar('senha2', 'as senhas não conferem');
      }
      return erros;
    };

    const fechar = (salvo) => {
      form.removeEventListener('input', aoDigitar);
      form.removeEventListener('submit', aoEnviar);
      cancelar.removeEventListener('click', aoCancelar);
      box.hidden = true;
      resolve(salvo);
    };
    const aoCancelar = () => fechar(null);

    const aoEnviar = async (ev) => {
      ev.preventDefault();
      const erros = validar();
      if (erros.length) {
        msg.className = 'form-msg erro';
        msg.textContent = `Confira: ${erros.join(', ')}.`;
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      const doc = digitos(campo('documento').value);
      const novo = {
        tipo: doc.length === 14 ? 'PJ' : 'PF',
        documento: doc,
        nome: campo('nome').value.trim(),
        contato: campo('contato').value.trim(),
        cep: digitos(campo('cep').value),
        logradouro: campo('logradouro').value.trim(),
        numero: campo('numero').value.trim(),
        complemento: campo('complemento').value.trim(),
        bairro: campo('bairro').value.trim(),
        cidade: campo('cidade').value.trim(),
        uf: campo('uf').value,
        telefone: digitos(campo('telefone').value),
        email: novaConta ? campo('email').value.trim().toLowerCase() : (user.email || '').toLowerCase(),
      };
      enviar.disabled = true;
      msg.className = 'form-msg';
      msg.textContent = 'Salvando...';
      if (novaConta) return criarConta(novo);
      const { error } = await sb.from('clientes').upsert({ id: user.id, ...novo });
      enviar.disabled = false;
      if (error) {
        console.error(error);
        msg.className = 'form-msg erro';
        msg.textContent = 'Não foi possível salvar agora. Tente novamente em instantes.';
        return;
      }
      fechar(novo);
    };

    // Conta com e-mail: o cadastro vai junto e é gravado no primeiro acesso, depois da confirmação.
    const criarConta = async (novo) => {
      const { data, error } = await sb.auth.signUp({
        email: novo.email,
        password: campo('senha').value,
        options: {
          emailRedirectTo: location.origin + location.pathname,
          data: { full_name: novo.contato, cadastro: novo },
        },
      });
      enviar.disabled = false;
      if (error) {
        console.error(error);
        msg.className = 'form-msg erro';
        msg.textContent = error.code === 'weak_password'
          ? 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'
          : error.code === 'over_email_send_rate_limit' || error.status === 429
            ? 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'
            : error.code === 'email_address_invalid'
              ? 'Confira o e-mail informado.'
              : 'Não foi possível criar a conta agora. Tente novamente em instantes.';
        return;
      }
      // E-mail que já tem conta: o Supabase responde sem identidades, sem revelar a conta.
      if (data.user && !data.user.identities?.length) {
        msg.className = 'form-msg erro';
        msg.textContent = 'Este e-mail já tem uma conta. Volte e entre com a sua senha ou use "Esqueci minha senha".';
        return;
      }
      fechar({ contaNova: true, email: novo.email });
    };

    form.addEventListener('input', aoDigitar);
    form.addEventListener('submit', aoEnviar);
    cancelar.addEventListener('click', aoCancelar);
    box.hidden = false;
    (novaConta && !campo('email').value ? campo('email') : campo('documento')).focus();
  });
}
