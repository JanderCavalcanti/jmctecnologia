# Supabase no Easypanel: Área do cliente

A Área do cliente usa um **Supabase enxuto** na VPS da JMC (Easypanel, projeto `jmc`, serviço `supabase`),
publicado em `https://supabase.jmctecnologia.com.br`. O site continua estático no GitHub Pages; o navegador
fala direto com a API do Supabase, e as regras do banco (Row Level Security) garantem que cada cliente veja
só o que é dele.

## O que está instalado
O compose está em [`supabase/easypanel/docker-compose.yml`](../supabase/easypanel/docker-compose.yml)
(modelo das variáveis em `supabase/easypanel/env.example`). Só o que a Área do cliente usa:

| Parte | Para quê | Limite de memória |
|---|---|---|
| `db` (Postgres) | dados | 512 MB |
| `auth` (GoTrue) | login com Google | 128 MB |
| `rest` (PostgREST) | API das tabelas | 128 MB |
| `realtime` | atualização ao vivo das propostas | 384 MB |
| `meta` + `studio` | painel de administração | 160 + 384 MB |
| `gateway` (nginx) | porta de entrada e senha do painel | 64 MB |

Ficaram de fora storage, edge functions, analytics e pooler. Em uso real fica perto de 620 MB.

- **Painel (Studio):** `https://supabase.jmctecnologia.com.br`. Usuário e senha estão na última linha das
  variáveis do serviço no Easypanel (Environment).
- **Segredos** (senha do banco, JWT_SECRET, SERVICE_ROLE_KEY): só no Easypanel. A **ANON_KEY** é pública e
  fica em `assets/js/supabase-config.js`. A SERVICE_ROLE_KEY nunca vai para o site.

## Tabelas e regras
O arquivo [`supabase/schema.sql`](../supabase/schema.sql) cria `clientes`, `propostas` e `admins` com as
regras de acesso. Para rodar de novo (sem perder dados): Studio → **SQL Editor** → colar → **Run**.
Novo administrador:

```sql
insert into public.admins (email) values ('email-da-pessoa@gmail.com');
```

## Ligar o login com Google
### No Google Cloud
1. Acesse https://console.cloud.google.com e selecione o projeto **jmctecnologia-e2d51** (o mesmo do Firebase) ou crie outro.
2. **Google Auth Platform → Branding** (antiga Tela de consentimento OAuth): nome `JMC Tecnologia e Consultoria`,
   e-mail de suporte e domínio autorizado `jmctecnologia.com.br`. Em **Público**, tipo **Externo**, clique em
   **Publicar app** (em modo de teste só os e-mails cadastrados como testadores conseguem entrar).
3. **Clientes → Criar cliente → Aplicativo da Web**:
   - Origens JavaScript autorizadas: `https://www.jmctecnologia.com.br`
   - URIs de redirecionamento autorizados: `https://supabase.jmctecnologia.com.br/auth/v1/callback`
4. Copie o **ID do cliente** e a **Chave secreta do cliente**.

### No Easypanel
No serviço `jmc / supabase` → **Environment**, preencha e salve:

```
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=<ID do cliente>
GOOGLE_SECRET=<chave secreta>
```

Depois clique em **Deploy**. **A chave secreta fica só no Easypanel; nunca no site nem em mensagens.**

## Backup
Os dados ficam no volume `db-data` do serviço. Configure um backup diário (Easypanel ou `pg_dump`) e guarde fora da VPS.
