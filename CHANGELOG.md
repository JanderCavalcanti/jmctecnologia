# Histórico de versões

O número da versão fica no arquivo `VERSION` e aparece no rodapé do site.
Padrão MAJOR.MINOR.PATCH:

- **MAJOR**: mudança grande no site (novo visual, nova estrutura).
- **MINOR**: recurso novo (uma seção, uma página, uma função na Área do cliente).
- **PATCH**: correção ou ajuste de texto.

Ao publicar na `main`, o site ganha a tag `vX.Y.Z` no GitHub.

## 1.2.0 (2026-10-15)

- Área do cliente: entrar com e-mail e senha, além do Google.
- Criar conta com e-mail: a senha é criada na mesma tela do cadastro, e a conta é ativada pelo link enviado por e-mail.
- "Esqueci minha senha": link por e-mail para criar uma nova senha.
- E-mails da Área do cliente com o visual da JMC.

## 1.1.1 (2026-10-15)

- Página inicial: removido o quadro escuro ao lado do título.

## 1.1.0 (2026-10-14)

- Painel JMC com menu lateral: **Clientes** e **Propostas** (no celular, o menu fica no topo).
- Clientes: lista dos clientes cadastrados com documento, contato, cidade, número de propostas e data do cadastro, com busca.
- Propostas: o e-mail do cliente é sugerido a partir dos clientes cadastrados.
- Administradores entram direto no Painel JMC, sem a tela de cadastro de cliente.

## 1.0.1 (2026-10-14)

- Área do cliente: o login Google voltava para a tela de login sem entrar; corrigido no Supabase da VPS.
- Área do cliente: ao entrar, o Google sempre pergunta qual conta usar.

## 1.0.0 (2026-10-14)

Primeira versão numerada, com o que já está no ar:

- Página inicial com os 4 serviços, slogan "Tecnologia, gestão e resultado." e imagem de compartilhamento.
- Formulário de contato.
- Área do cliente com login Google, cadastro do cliente e acompanhamento das propostas (Proposta comercial → NDA → Contrato assinado), no Supabase da JMC.
- Domínio www.jmctecnologia.com.br com HTTPS.
