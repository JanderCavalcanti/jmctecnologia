// Login de clientes com Google (ou Microsoft) ou com e-mail e senha, via Supabase Auth.
import { supabaseConfig, loginProviders } from './supabase-config.js';
import { iniciarCRM, pararCRM } from './crm.js';
import { pedirCadastro, senhaValida } from './cadastro.js';

const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const loginBox = document.getElementById('login-box');
const panel = document.getElementById('client-panel');
const msg = document.getElementById('login-msg');
const loginForm = document.getElementById('login-form');
const confirmarBox = document.getElementById('confirmar-box');
const confirmarMsg = document.getElementById('confirmar-msg');
const senhaBox = document.getElementById('senha-box');
const senhaForm = document.getElementById('senha-form');
const senhaMsg = document.getElementById('senha-msg');
const buttons = [...loginBox.querySelectorAll('[data-provider]')].filter((b) => {
  const active = loginProviders.includes(b.dataset.provider);
  b.hidden = !active;
  return active;
});

// Nome do provedor no Supabase para cada botão.
const PROVEDORES = { google: 'google', microsoft: 'azure' };
const VOLTA = () => location.origin + location.pathname;
const ERRO_GERAL = 'Não foi possível entrar agora. Tente novamente em instantes.';

function showMessage(text, el = msg) {
  el.textContent = text;
}

function mostrarSo(box) {
  [loginBox, confirmarBox, senhaBox].forEach((b) => (b.hidden = b !== box));
}

function showUser(user) {
  // O painel só aparece depois que o mini CRM confere o cadastro do cliente (crm.js).
  mostrarSo(user ? null : loginBox);
  panel.hidden = true;
  document.getElementById('cadastro-box').hidden = true;
  if (!user) return;
  const meta = user.user_metadata || {};
  const nome = meta.full_name || meta.name || user.email || 'cliente';
  document.getElementById('client-name').textContent = nome.split(' ')[0];
  document.getElementById('client-email').textContent = user.email || '';
  const photo = document.getElementById('client-photo');
  const foto = meta.avatar_url || meta.picture;
  photo.hidden = !foto;
  if (foto) photo.src = foto;
}

// Volta do Google com erro (ex.: provedor não ativado no Supabase).
function erroNaUrl() {
  const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const erro = params.get('error_description') || params.get('error');
  if (!erro) return;
  history.replaceState(null, '', location.pathname);
  showMessage(ERRO_GERAL);
  console.error('Login:', erro);
}

// Link dos e-mails (confirmação de conta ou nova senha): ?token_hash=...&type=email|recovery
function linkDoEmail() {
  const params = new URLSearchParams(location.search);
  const tokenHash = params.get('token_hash');
  const tipo = params.get('type');
  if (!tokenHash || !['email', 'signup', 'recovery'].includes(tipo)) return null;
  history.replaceState(null, '', location.pathname);
  return { tokenHash, tipo };
}

// Botões "Mostrar" dos campos de senha.
document.addEventListener('click', (ev) => {
  const botao = ev.target.closest('[data-mostrar]');
  if (!botao) return;
  const campo = botao.parentElement.querySelector('input');
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
});

function senhasOcultas(form) {
  form.querySelectorAll('[data-mostrar]').forEach((b) => {
    b.textContent = 'Mostrar';
    b.parentElement.querySelector('input').type = 'password';
  });
}

async function start() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    buttons.forEach((b) => (b.disabled = true));
    loginForm.querySelectorAll('input, button').forEach((c) => (c.disabled = true));
    showMessage('O login ainda está sendo configurado. Enquanto isso, use os canais de suporte abaixo.');
    return;
  }

  const { createClient } = await import(SDK);
  const sb = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  erroNaUrl();
  const link = linkDoEmail();
  // Quem chega pelo link de nova senha cria a senha antes de ver o painel.
  let redefinindo = link?.tipo === 'recovery';

  buttons.forEach((button) =>
    button.addEventListener('click', async () => {
      showMessage('');
      buttons.forEach((b) => (b.disabled = true));
      const { error } = await sb.auth.signInWithOAuth({
        provider: PROVEDORES[button.dataset.provider],
        options: {
          redirectTo: VOLTA(),
          // Sempre pergunta qual conta usar, em vez de entrar direto na última
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        console.error(error);
        showMessage(ERRO_GERAL);
        buttons.forEach((b) => (b.disabled = false));
      }
    })
  );

  // Entrar com e-mail e senha.
  const campoEmail = loginForm.elements.email;
  const campoSenha = loginForm.elements.senha;
  const entrar = loginForm.querySelector('[type="submit"]');
  loginForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = campoEmail.value.trim().toLowerCase();
    const senha = campoSenha.value;
    if (!email || !senha) {
      showMessage('Informe o seu e-mail e a sua senha.');
      (email ? campoSenha : campoEmail).focus();
      return;
    }
    showMessage('Entrando...');
    entrar.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    entrar.disabled = false;
    if (!error) {
      showMessage('');
      loginForm.reset();
      senhasOcultas(loginForm);
      return;
    }
    console.error(error);
    if (error.code === 'email_not_confirmed') return mostrarConfirmar(email, 'Este e-mail ainda não foi confirmado.');
    showMessage(
      error.code === 'invalid_credentials'
        ? 'E-mail ou senha incorretos. Confira e tente de novo, ou use "Esqueci minha senha".'
        : error.status === 429
          ? 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'
          : ERRO_GERAL
    );
  });

  // Esqueci minha senha: manda o link para criar uma nova.
  document.getElementById('esqueci-senha').addEventListener('click', async () => {
    const email = campoEmail.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Informe o seu e-mail acima e clique de novo em "Esqueci minha senha".');
      campoEmail.focus();
      return;
    }
    showMessage('Enviando...');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: VOLTA() });
    if (error) {
      console.error(error);
      return showMessage(error.status === 429 ? 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.' : ERRO_GERAL);
    }
    // Mesma resposta exista ou não a conta.
    showMessage(`Se houver uma conta com ${email}, enviamos um link para criar uma nova senha.`);
  });

  // Criar conta com e-mail: cadastro completo + senha na mesma tela.
  document.getElementById('criar-conta').addEventListener('click', async () => {
    showMessage('');
    mostrarSo(null);
    const r = await pedirCadastro(sb, null, null, { novaConta: { email: campoEmail.value.trim() } });
    if (r?.contaNova) return mostrarConfirmar(r.email);
    mostrarSo(loginBox);
  });

  // Aviso para confirmar o e-mail.
  let emailConfirmar = '';
  function mostrarConfirmar(email, aviso = '') {
    emailConfirmar = email;
    document.getElementById('confirmar-email').textContent = email;
    showMessage(aviso, confirmarMsg);
    mostrarSo(confirmarBox);
  }
  document.getElementById('reenviar').addEventListener('click', async () => {
    showMessage('Reenviando...', confirmarMsg);
    const { error } = await sb.auth.resend({ type: 'signup', email: emailConfirmar, options: { emailRedirectTo: VOLTA() } });
    if (error) console.error(error);
    showMessage(
      !error
        ? 'Pronto, enviamos de novo. Confira também a caixa de spam.'
        : error.status === 429
          ? 'Aguarde um minuto antes de pedir outro e-mail.'
          : 'Não foi possível reenviar agora. Tente novamente em instantes.',
      confirmarMsg
    );
  });
  document.getElementById('voltar-login').addEventListener('click', () => {
    showMessage('');
    if (emailConfirmar) campoEmail.value = emailConfirmar;
    mostrarSo(loginBox);
    campoSenha.focus();
  });

  // Nova senha (link do "Esqueci minha senha").
  senhaForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const s1 = senhaForm.elements.senha.value;
    const s2 = senhaForm.elements.senha2.value;
    if (!senhaValida(s1)) return showMessage('A senha precisa ter pelo menos 8 caracteres, com letras e números.', senhaMsg);
    if (s1 !== s2) return showMessage('As senhas não conferem.', senhaMsg);
    const salvar = senhaForm.querySelector('[type="submit"]');
    salvar.disabled = true;
    showMessage('Salvando...', senhaMsg);
    const { data, error } = await sb.auth.updateUser({ password: s1 });
    salvar.disabled = false;
    if (error) {
      console.error(error);
      return showMessage(
        error.code === 'same_password'
          ? 'A nova senha precisa ser diferente da anterior.'
          : error.code === 'weak_password'
            ? 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'
            : 'Não foi possível salvar a senha agora. Tente novamente em instantes.',
        senhaMsg
      );
    }
    senhaForm.reset();
    senhasOcultas(senhaForm);
    showMessage('', senhaMsg);
    redefinindo = false;
    abrir(data.user);
  });

  document.getElementById('logout').addEventListener('click', () => sb.auth.signOut());

  function abrir(user) {
    showUser(user);
    if (!user) return pararCRM();
    iniciarCRM(sb, user).catch((err) => {
      console.error(err);
      panel.hidden = false;
      document.getElementById('crm-msg').textContent = 'Não foi possível carregar suas propostas agora.';
    });
  }

  // Evita reabrir o painel a cada renovação do token: só reage quando muda a pessoa logada.
  let atual = null;
  sb.auth.onAuthStateChange((_evento, session) => {
    const user = session?.user || null;
    if ((user?.id || null) === atual) return;
    atual = user?.id || null;
    if (redefinindo && user) return;
    // Fora do callback: o Supabase pede para não chamar o banco dentro dele.
    setTimeout(() => abrir(user));
  });

  if (link) {
    const { data, error } = await sb.auth.verifyOtp({ token_hash: link.tokenHash, type: link.tipo });
    if (error) {
      console.error(error);
      redefinindo = false;
      const { data: s } = await sb.auth.getSession();
      if (s.session) return abrir(s.session.user);
      mostrarSo(loginBox);
      showMessage(
        link.tipo === 'recovery'
          ? 'Este link de nova senha expirou ou já foi usado. Clique em "Esqueci minha senha" para receber outro.'
          : 'Este link expirou ou já foi usado. Se a conta já foi confirmada, entre com o seu e-mail e senha.'
      );
      return;
    }
    if (redefinindo) {
      atual = data.user.id;
      pararCRM();
      showUser(data.user);
      mostrarSo(senhaBox);
      senhaForm.elements.senha.focus();
    }
  }
}

start().catch((err) => {
  console.error(err);
  showMessage('Não foi possível carregar o login. Verifique sua conexão e recarregue a página.');
});
