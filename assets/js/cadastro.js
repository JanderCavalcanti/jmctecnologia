// Cadastro do cliente no primeiro acesso: CPF/CNPJ, nome ou razão social, endereço pelo CEP e telefone.
// Os dados ficam em clientes/{uid} no Firestore (regras em docs/firestore.rules).

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

// Mostra o formulário e resolve quando o cliente salvar. "dados" preenche o formulário ao editar.
export function pedirCadastro(fs, db, user, dados) {
  const box = document.getElementById('cadastro-box');
  const form = document.getElementById('cadastro-form');
  const msg = document.getElementById('cadastro-msg');
  const cancelar = document.getElementById('cadastro-cancelar');
  const campo = (nome) => form.elements[nome];
  const labelNome = document.getElementById('cadastro-nome-label');

  form.reset();
  msg.textContent = '';
  msg.className = 'form-msg';
  form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
  if (dados) {
    campo('documento').value = mascaraDocumento(dados.documento);
    campo('telefone').value = mascaraTelefone(dados.telefone);
    campo('cep').value = mascaraCep(dados.cep);
    ['nome', 'contato', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].forEach((k) => (campo(k).value = dados[k] || ''));
  } else {
    // Prévia vinda da conta Google; o cliente pode trocar.
    campo('contato').value = user.displayName || '';
  }
  cancelar.hidden = !dados;

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
        email: (user.email || '').toLowerCase(),
        atualizadoEm: fs.serverTimestamp(),
        ...(dados ? {} : { criadoEm: fs.serverTimestamp() }),
      };
      const botao = form.querySelector('button[type="submit"]');
      botao.disabled = true;
      msg.className = 'form-msg';
      msg.textContent = 'Salvando...';
      try {
        await fs.setDoc(fs.doc(db, 'clientes', user.uid), novo, { merge: true });
        fechar(novo);
      } catch (err) {
        console.error(err);
        msg.className = 'form-msg erro';
        msg.textContent = 'Não foi possível salvar agora. Tente novamente em instantes.';
      } finally {
        botao.disabled = false;
      }
    };

    form.addEventListener('input', aoDigitar);
    form.addEventListener('submit', aoEnviar);
    cancelar.addEventListener('click', aoCancelar);
    box.hidden = false;
    campo('documento').focus();
  });
}
