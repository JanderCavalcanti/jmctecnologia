# Mini CRM da Área do cliente: status das propostas

O cliente entra na Área do cliente com o Google e vê as propostas ligadas ao e-mail dele, na pipeline
**Proposta comercial → NDA → Contrato assinado**, com a data de cada etapa.
Quem cadastra e atualiza é a JMC, pela mesma página, entrando com um e-mail de administrador.

Os dados ficam no **Cloud Firestore** do projeto `jmctecnologia-e2d51` (plano gratuito atende com folga).

## Ativar (uma vez só)

### 1. Criar o banco
1. Acesse https://console.firebase.google.com e abra o projeto **jmctecnologia-e2d51**.
2. Menu **Criação (Build) → Firestore Database → Criar banco de dados**.
3. Local: **southamerica-east1 (São Paulo)**. Modo: **produção**. Clique em **Criar**.

### 2. Colar as regras de segurança
1. Na aba **Regras** do Firestore, apague o conteúdo e cole o arquivo [`firestore.rules`](firestore.rules) deste repositório.
2. Clique em **Publicar**.

As regras garantem que cada cliente lê só as próprias propostas e que só administradores gravam.

### 3. Cadastrar você como administrador
1. Na aba **Dados**, clique em **Iniciar coleção**. ID da coleção: `admins`.
2. ID do documento: **o seu e-mail de login, em letras minúsculas** (ex.: `fulano@gmail.com`).
3. Adicione um campo qualquer, por exemplo `nome` (string) = `Jander`. Salve.

O e-mail de administrador fica só no Firebase; não aparece no código do site.
Para dar acesso a outra pessoa da JMC, crie outro documento em `admins` com o e-mail dela.

## Cadastro do cliente no primeiro acesso
No primeiro login, antes de ver o painel, o cliente preenche: CPF ou CNPJ (com máscara e validação),
nome completo ou razão social (o rótulo muda conforme o documento), nome para contato (já vem com o nome
da conta Google), telefone e endereço. Ao digitar o CEP,
logradouro, bairro, cidade e estado são preenchidos pelo ViaCEP. Depois ele pode corrigir pelo botão **Meus dados**.

Os dados ficam na coleção `clientes` (um documento por login, com o e-mail do cliente) e você vê tudo pelo
console do Firebase. Administradores não passam por essa tela.

## Usar no dia a dia
1. Entre na Área do cliente com o e-mail de administrador. Aparece o **Painel JMC**.
2. Cadastre a proposta com o **e-mail que o cliente usa no login Google**, a empresa e o título.
   Ela começa na etapa *Proposta comercial*, com a data de hoje.
3. Quando o NDA ou o contrato avançar, mude a etapa no seletor da proposta. A data é registrada sozinha.
   Voltar uma etapa apaga as datas das etapas seguintes.
4. O cliente vê a mudança na hora, sem recarregar a página.

Também dá para editar direto no console do Firebase (coleção `propostas`). Campos:

| Campo | Exemplo | Observação |
|---|---|---|
| `clienteEmail` | `cliente@empresa.com` | minúsculo, o mesmo do login |
| `empresa` | `Empresa X` | |
| `titulo` | `Sistema de gestão de estoque` | |
| `observacao` | `Aguardando assinatura do jurídico` | opcional, aparece para o cliente |
| `etapa` | `0`, `1` ou `2` | 0 = Proposta comercial, 1 = NDA, 2 = Contrato assinado |
| `datas` | mapa com `proposta`, `nda`, `contrato` | timestamps de quando cada etapa começou |
