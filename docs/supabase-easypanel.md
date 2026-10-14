# Supabase no Easypanel: instalação da Área do cliente

A Área do cliente usa o **Supabase** instalado na VPS da JMC pelo Easypanel: login com Google (Supabase Auth)
e banco Postgres com as tabelas `clientes`, `propostas` e `admins`. O site continua estático no GitHub Pages;
o navegador fala direto com a API do Supabase, e as regras do banco (Row Level Security) garantem que cada
cliente veja só o que é dele.

Nos exemplos abaixo o endereço do Supabase é `https://supabase.jmctecnologia.com.br`. Troque pelo que você usar.

## 1. Domínio
Crie um registro **A** `supabase` apontando para o IP da VPS do Easypanel (DNS na Hostinger).
Não mexa no `@` nem no `www`.

## 2. Subir o Supabase
1. No Easypanel, abra (ou crie) um projeto, por exemplo `jmc`.
2. **+ Service → Templates → Supabase**. Confira os valores gerados e clique em **Create**.
3. Em **Domains** do serviço, ligue `supabase.jmctecnologia.com.br` ao container **kong**, porta **8000**, com HTTPS.
4. Na aba **Environment** (arquivo `.env` do template), confira:
   - `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DASHBOARD_PASSWORD`:
     não podem ficar com os valores de exemplo da documentação. A `ANON_KEY` e a `SERVICE_ROLE_KEY`
     precisam ser geradas com o mesmo `JWT_SECRET` (o template do Easypanel já faz isso).
   - `API_EXTERNAL_URL=https://supabase.jmctecnologia.com.br`
   - `SUPABASE_PUBLIC_URL=https://supabase.jmctecnologia.com.br`
   - `SITE_URL=https://www.jmctecnologia.com.br/area-do-cliente.html`
   - `ADDITIONAL_REDIRECT_URLS=https://www.jmctecnologia.com.br/teste/area-do-cliente.html`
   - `DISABLE_SIGNUP=false` (o cadastro acontece pelo Google)
5. Abra `https://supabase.jmctecnologia.com.br` e entre no **Supabase Studio** com o usuário e senha do
   dashboard (`DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`).

## 3. Criar o login com Google
### No Google Cloud
1. Acesse https://console.cloud.google.com e selecione o projeto **jmctecnologia-e2d51** (o mesmo do Firebase) ou crie outro.
2. **APIs e serviços → Tela de consentimento OAuth**: tipo **Externo**, nome `JMC Tecnologia e Consultoria`,
   e-mail de suporte, domínio `jmctecnologia.com.br`. Depois clique em **Publicar app** (em "teste", só os
   e-mails cadastrados como testadores conseguem entrar).
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**:
   - Origens JavaScript autorizadas: `https://www.jmctecnologia.com.br`
   - URIs de redirecionamento autorizados: `https://supabase.jmctecnologia.com.br/auth/v1/callback`
4. Copie o **ID do cliente** e a **Chave secreta do cliente**.

### No Easypanel
No arquivo compose do Supabase, no serviço **auth**, acrescente em `environment`:

```yaml
GOTRUE_EXTERNAL_GOOGLE_ENABLED: "true"
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_SECRET}
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: https://supabase.jmctecnologia.com.br/auth/v1/callback
```

e no `.env` (aba Environment):

```
GOOGLE_CLIENT_ID=<ID do cliente>
GOOGLE_SECRET=<chave secreta>
```

Clique em **Deploy** para reiniciar. **A chave secreta fica só no Easypanel; nunca no site nem em mensagens.**

## 4. Criar as tabelas e as regras
1. No Studio: **SQL Editor → New query**.
2. Cole todo o arquivo [`supabase/schema.sql`](../supabase/schema.sql) e clique em **Run**.
   Pode rodar de novo depois sem perder dados.

## 5. Cadastrar você como administrador
No **SQL Editor**, rode (com o seu e-mail de login do Google, em minúsculas):

```sql
insert into public.admins (email) values ('seu-email@gmail.com');
```

O e-mail fica só no banco; não aparece no código do site. Para outra pessoa da JMC, rode de novo com o e-mail dela.

## 6. Ligar no site
Envie para quem mantém o site a **URL** (`https://supabase.jmctecnologia.com.br`) e a **ANON_KEY**.
Elas vão em `assets/js/supabase-config.js`. A anon key é pública por natureza; a **SERVICE_ROLE_KEY nunca
vai para o site**, porque ela ignora todas as regras de acesso.

## Backup
Os dados ficam na sua VPS. Configure o backup do volume do Postgres no Easypanel (ou um `pg_dump` diário)
e guarde fora da VPS.
