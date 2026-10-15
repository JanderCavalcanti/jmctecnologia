// Formulário de contato: valida no navegador e envia pelo FormSubmit para o e-mail da JMC.
import { emailContato } from './contato-config.js';

const form = document.getElementById('contact-form');
const msg = document.getElementById('form-msg');
const button = form.querySelector('button[type="submit"]');

function showMessage(text, kind = '') {
  msg.textContent = text;
  msg.className = `form-msg ${kind}`;
}

function validate() {
  let first = null;
  form.querySelectorAll('input:not(.hp), textarea').forEach((field) => {
    field.value = field.value.trim();
    const ok = field.checkValidity();
    field.setAttribute('aria-invalid', String(!ok));
    if (!ok && !first) first = field;
  });
  if (first) {
    first.focus();
    showMessage(first.type === 'email' && first.value
      ? 'Confira o e-mail informado.'
      : 'Preencha os campos obrigatórios marcados com *.', 'erro');
    return false;
  }
  return true;
}

form.addEventListener('input', (e) => {
  if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) {
    e.target.setAttribute('aria-invalid', 'false');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.botcheck.checked) return;
  if (!validate()) return;

  const dados = Object.fromEntries(new FormData(form));
  const assunto = `[JMC] Contato ${dados.empresa || dados.nome}`;

  button.disabled = true;
  showMessage('Enviando…');
  try {
    const resposta = await fetch(`https://formsubmit.co/ajax/${emailContato}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: assunto,
        _replyto: dados.email,
        _template: 'table',
        _captcha: 'false',
        Nome: dados.nome,
        Empresa: dados.empresa || '-',
        'E-mail': dados.email,
        'WhatsApp/telefone': dados.telefone || '-',
        Mensagem: dados.mensagem,
      }),
    });
    const resultado = await resposta.json();
    if (String(resultado.success) !== 'true') throw new Error(resultado.message);
    form.reset();
    showMessage('Mensagem enviada! Retornamos em breve.', 'ok');
  } catch (err) {
    console.error(err);
    showMessage('Não foi possível enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.', 'erro');
  } finally {
    button.disabled = false;
  }
});
