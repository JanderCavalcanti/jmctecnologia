// Login de clientes com Google ou Microsoft via Firebase Authentication.
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

const loginBox = document.getElementById('login-box');
const panel = document.getElementById('client-panel');
const msg = document.getElementById('login-msg');
const buttons = loginBox.querySelectorAll('[data-provider]');

const ERROS = {
  'auth/popup-closed-by-user': 'A janela de login foi fechada antes de concluir.',
  'auth/cancelled-popup-request': 'A janela de login foi fechada antes de concluir.',
  'auth/popup-blocked': 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.',
  'auth/account-exists-with-different-credential': 'Este e-mail já está ligado a outro tipo de login. Use o botão que você usou da primeira vez.',
  'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase.',
  'auth/operation-not-allowed': 'Este tipo de login ainda não foi ativado no Firebase.',
};

function showMessage(text) {
  msg.textContent = text;
}

function showUser(user) {
  loginBox.hidden = !!user;
  panel.hidden = !user;
  if (!user) return;
  document.getElementById('client-name').textContent = (user.displayName || user.email || 'cliente').split(' ')[0];
  document.getElementById('client-email').textContent = user.email || '';
  const photo = document.getElementById('client-photo');
  if (user.photoURL) {
    photo.src = user.photoURL;
    photo.hidden = false;
  }
}

async function start() {
  if (!firebaseConfig.apiKey) {
    buttons.forEach((b) => (b.disabled = true));
    showMessage('O login ainda está sendo configurado. Enquanto isso, fale com a gente pelo WhatsApp.');
    return;
  }

  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const {
    getAuth, onAuthStateChanged, signInWithPopup, signOut,
    GoogleAuthProvider, OAuthProvider, browserLocalPersistence, setPersistence,
  } = await import(`${SDK}/firebase-auth.js`);

  const auth = getAuth(initializeApp(firebaseConfig));
  auth.languageCode = 'pt';
  await setPersistence(auth, browserLocalPersistence);

  const providers = {
    google: () => new GoogleAuthProvider(),
    microsoft: () => {
      const p = new OAuthProvider('microsoft.com');
      p.setCustomParameters({ prompt: 'select_account' });
      return p;
    },
  };

  buttons.forEach((button) =>
    button.addEventListener('click', async () => {
      showMessage('');
      buttons.forEach((b) => (b.disabled = true));
      try {
        await signInWithPopup(auth, providers[button.dataset.provider]());
      } catch (err) {
        showMessage(ERROS[err.code] || 'Não foi possível entrar agora. Tente novamente em instantes.');
        console.error(err);
      } finally {
        buttons.forEach((b) => (b.disabled = false));
      }
    })
  );

  document.getElementById('logout').addEventListener('click', () => signOut(auth));
  onAuthStateChanged(auth, showUser);
}

start().catch((err) => {
  console.error(err);
  showMessage('Não foi possível carregar o login. Verifique sua conexão e recarregue a página.');
});
