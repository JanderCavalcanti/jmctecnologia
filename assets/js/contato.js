// Formulário de contato: valida no navegador e envia pelo Web3Forms.
import { web3formsKey, emailContato } from './contato-config.js';

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

function resumo(dados) {
  return [
    `Nome: ${dados.nome}`,
    dados.empresa && `Empresa: ${dados.empresa}`,
    `E-mail: ${dados.email}`,
    dados.telefone && `WhatsApp/telefone: ${dados.telefone}`,
    '',
    dados.mensagem,
  ].filter((linha) => linha !== undefined && linha !== '').join('\n');
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
  const assunto = `Contato pelo site: ${dados.nome}${dados.empresa ? ` (${dados.empresa})` : ''}`;

  if (!web3formsKey) {
    const corpo = resumo(dados);
    window.location.href = `mailto:${emailContato}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    showMessage('Abrimos o seu programa de e-mail com a mensagem pronta. É só enviar.', 'ok');
    return;
  }

  button.disabled = true;
  showMessage('Enviando…');
  try {
    const resposta = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: web3formsKey,
        subject: assunto,
        from_name: 'Site JMC Tecnologia',
        replyto: dados.email,
        name: dados.nome,
        email: dados.email,
        empresa: dados.empresa,
        telefone: dados.telefone,
        message: dados.mensagem,
      }),
    });
    const resultado = await resposta.json();
    if (!resultado.success) throw new Error(resultado.message);
    form.reset();
    showMessage('Mensagem enviada! Retornamos em breve.', 'ok');
  } catch (err) {
    console.error(err);
    showMessage('Não foi possível enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.', 'erro');
  } finally {
    button.disabled = false;
  }
});
