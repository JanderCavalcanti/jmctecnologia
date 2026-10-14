-- Banco da Área do cliente (Supabase / Postgres).
-- Rodar uma vez em: Supabase Studio > SQL Editor > New query > colar tudo > Run.
-- Pode ser rodado de novo sem perder dados.

-- Administradores da JMC: quem está aqui vê o Painel JMC e grava propostas.
-- O e-mail fica só no banco, nunca no código do site.
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

-- Cadastro do cliente, preenchido no primeiro acesso.
create table if not exists public.clientes (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  tipo text not null check (tipo in ('PF', 'PJ')),
  documento text not null check (documento ~ '^[0-9]{11}$|^[0-9]{14}$'),
  nome text not null,
  contato text not null,
  telefone text not null check (telefone ~ '^[0-9]{10,11}$'),
  cep text not null check (cep ~ '^[0-9]{8}$'),
  logradouro text not null,
  numero text not null,
  complemento text not null default '',
  bairro text not null,
  cidade text not null,
  uf char(2) not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Propostas: uma por serviço, com a pipeline Proposta comercial (0) -> NDA (1) -> Contrato assinado (2).
create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  cliente_email text not null check (cliente_email = lower(cliente_email)),
  empresa text not null default '',
  titulo text not null,
  observacao text not null default '',
  etapa smallint not null default 0 check (etapa between 0 and 2),
  data_proposta timestamptz not null default now(),
  data_nda timestamptz,
  data_contrato timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists propostas_cliente_email_idx on public.propostas (cliente_email);

-- E-mail de quem está logado, em minúsculas.
create or replace function public.meu_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Quem está logado é administrador?
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = public.meu_email())
$$;

-- Datas das etapas e "atualizado_em" ficam por conta do banco.
create or replace function public.propostas_datas() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.etapa >= 1 and new.data_nda is null then new.data_nda := now(); end if;
  if new.etapa >= 2 and new.data_contrato is null then new.data_contrato := now(); end if;
  if new.etapa < 2 then new.data_contrato := null; end if;
  if new.etapa < 1 then new.data_nda := null; end if;
  return new;
end $$;
drop trigger if exists propostas_datas on public.propostas;
create trigger propostas_datas before insert or update on public.propostas
  for each row execute function public.propostas_datas();

create or replace function public.clientes_atualizado() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists clientes_atualizado on public.clientes;
create trigger clientes_atualizado before update on public.clientes
  for each row execute function public.clientes_atualizado();

-- Regras de acesso (Row Level Security)
alter table public.admins enable row level security;
alter table public.clientes enable row level security;
alter table public.propostas enable row level security;

revoke all on public.admins, public.clientes, public.propostas from anon;
grant select on public.admins to authenticated;
grant select, insert, update on public.clientes to authenticated;
grant select, insert, update, delete on public.propostas to authenticated;

drop policy if exists "admin ve o proprio email" on public.admins;
create policy "admin ve o proprio email" on public.admins
  for select to authenticated using (email = public.meu_email());

drop policy if exists "cliente ve o proprio cadastro" on public.clientes;
create policy "cliente ve o proprio cadastro" on public.clientes
  for select to authenticated using (id = auth.uid() or public.eh_admin());

drop policy if exists "cliente cria o proprio cadastro" on public.clientes;
create policy "cliente cria o proprio cadastro" on public.clientes
  for insert to authenticated with check (id = auth.uid() and email = public.meu_email());

drop policy if exists "cliente edita o proprio cadastro" on public.clientes;
create policy "cliente edita o proprio cadastro" on public.clientes
  for update to authenticated
  using (id = auth.uid() or public.eh_admin())
  with check ((id = auth.uid() and email = public.meu_email()) or public.eh_admin());

drop policy if exists "cliente ve as proprias propostas" on public.propostas;
create policy "cliente ve as proprias propostas" on public.propostas
  for select to authenticated using (cliente_email = public.meu_email() or public.eh_admin());

drop policy if exists "admin grava propostas" on public.propostas;
create policy "admin grava propostas" on public.propostas
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Atualização ao vivo na tela do cliente (Realtime respeita as regras acima).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and tablename = 'propostas') then
    alter publication supabase_realtime add table public.propostas;
  end if;
end $$;
