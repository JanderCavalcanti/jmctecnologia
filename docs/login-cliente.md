# Configurar o login da Área do cliente (Google e Microsoft)

O login usa o **Firebase Authentication** (Google), gratuito para este volume de uso. O site continua estático no GitHub Pages; o Firebase cuida das contas.

## 1. Criar o projeto no Firebase
1. Acesse https://console.firebase.google.com e clique em **Criar projeto** (ex.: `jmc-tecnologia`). O Google Analytics é opcional.
2. Na página do projeto, clique no ícone **Web (`</>`)** para adicionar um app. Dê um nome (ex.: `site`) e **não** marque Firebase Hosting.
3. O Firebase mostra um bloco `firebaseConfig`. Copie `apiKey`, `authDomain`, `projectId` e `appId`.
   Esses valores podem ficar públicos no site; não são senhas.

## 2. Ativar o login com Google
1. Menu **Build → Authentication → Começar**.
2. Aba **Sign-in method → Adicionar novo provedor → Google**.
3. Ative, escolha o e-mail de suporte e salve.

## 3. Ativar o login com Microsoft
1. No Firebase, em **Sign-in method → Adicionar novo provedor → Microsoft**, ative e **copie a URL de callback** mostrada (algo como `https://jmc-tecnologia.firebaseapp.com/__/auth/handler`). Deixe a tela aberta.
2. Em outra aba, acesse https://entra.microsoft.com (ou portal.azure.com) com uma conta Microsoft.
3. **Identidade → Aplicativos → Registros de aplicativo → Novo registro**:
   - Nome: `JMC Área do cliente`
   - Tipos de conta: **Contas em qualquer diretório organizacional e contas Microsoft pessoais**
   - URI de redirecionamento: plataforma **Web**, cole a URL de callback do Firebase.
4. Na página do app criado, copie o **ID do aplicativo (cliente)**.
5. Em **Certificados e segredos → Novo segredo do cliente**, crie um segredo e copie o **Valor** (aparece uma vez só).
6. Volte ao Firebase e cole o ID do aplicativo e o segredo. Salve.
   **O segredo fica só no Firebase. Não envie para ninguém nem coloque no site.**
   O segredo expira (até 24 meses); anote a data para renovar.

## 4. Autorizar os endereços do site
Em **Authentication → Settings → Domínios autorizados**, adicione:
- `jandercavalcanti.github.io`
- `www.jmctecnologia.com.br` e `jmctecnologia.com.br` (para quando o domínio for apontado)

## 5. Ligar no site
Preencha `assets/js/firebase-config.js` com os valores do passo 1 (ou envie os quatro valores para quem mantém o site). Depois de publicado, os botões da Área do cliente passam a funcionar.

## Observação
Por enquanto **qualquer pessoa** com conta Google ou Microsoft consegue entrar e ver o painel, que só mostra canais de suporte. Para liberar conteúdo exclusivo (chamados, documentos), o próximo passo é guardar os dados no Firebase com regras que permitam acesso só aos e-mails dos clientes cadastrados.
