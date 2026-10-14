// Login de clientes com Google (ou Microsoft) via Supabase Auth.
import { supabaseConfig, loginProviders } from './supabase-config.js';
import { iniciarCRM, pararCRM } from './crm.js';

const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const loginBox = document.getElementById('login-box');
const panel = document.getElementById('client-panel');
const msg = document.getElementById('login-msg');
const buttons = [...loginBox.querySelectorAll('[data-provider]')].filter((b) => {
  const active = loginProviders.includes(b.dataset.provider);
  b.hidden = !active;
  return active;
});

// Nome do provedor no Supabase para cada botão.
const PROVEDORES = { google: 'google', microsoft: 'azure' };

function showMessage(text) {
  msg.textContent = text;
}

function showUser(user) {
  // O painel só aparece depois que o mini CRM confere o cadastro do cliente (crm.js).
  loginBox.hidden = !!user;
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
  showMessage('Não foi possível entrar agora. Tente novamente em instantes.');
  console.error('Login:', erro);
}

async function start() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    buttons.forEach((b) => (b.disabled = true));
    showMessage('O login ainda está sendo configurado. Enquanto isso, use os canais de suporte abaixo.');
    return;
  }

  const { createClient } = await import(SDK);
  const sb = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  erroNaUrl();

  buttons.forEach((button) =>
    button.addEventListener('click', async () => {
      showMessage('');
      buttons.forEach((b) => (b.disabled = true));
      const { error } = await sb.auth.signInWithOAuth({
        provider: PROVEDORES[button.dataset.provider],
        options: { redirectTo: location.origin + location.pathname },
      });
      if (error) {
        console.error(error);
        showMessage('Não foi possível entrar agora. Tente novamente em instantes.');
        buttons.forEach((b) => (b.disabled = false));
      }
    })
  );

  document.getElementById('logout').addEventListener('click', () => sb.auth.signOut());

  // Evita reabrir o painel a cada renovação do token: só reage quando muda a pessoa logada.
  let atual = null;
  sb.auth.onAuthStateChange((_evento, session) => {
    const user = session?.user || null;
    if ((user?.id || null) === atual) return;
    atual = user?.id || null;
    // Fora do callback: o Supabase pede para não chamar o banco dentro dele.
    setTimeout(() => {
      showUser(user);
      if (!user) return pararCRM();
      iniciarCRM(sb, user).catch((err) => {
        console.error(err);
        panel.hidden = false;
        document.getElementById('crm-msg').textContent = 'Não foi possível carregar suas propostas agora.';
      });
    });
  });
}

start().catch((err) => {
  console.error(err);
  showMessage('Não foi possível carregar o login. Verifique sua conexão e recarregue a página.');
});
