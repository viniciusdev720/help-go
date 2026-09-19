-- =======================================================
-- HELPGO: TABELA DE ADMINISTRADORES
-- Execute no SQL Editor do seu projeto Supabase.
-- O UID abaixo é o do admin já existente no Supabase Auth.
-- =======================================================

-- 1. CRIAR TABELA ADMINS (se ainda não existir)
create table if not exists public.admins (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    nome text not null default 'Administrador',
    ativo boolean not null default true,
    criado_em timestamptz not null default now()
);

-- 2. HABILITAR RLS
alter table public.admins enable row level security;

-- 3. POLÍTICAS DE SEGURANÇA DA TABELA ADMINS
-- O admin pode ler o próprio registro (necessário para Guard.requireAuth verificar)
drop policy if exists "admin_le_proprio_registro" on public.admins;
create policy "admin_le_proprio_registro"
on public.admins for select
to authenticated
using (id = auth.uid());

-- Nenhum usuário comum pode inserir ou alterar admins pelo navegador.
-- Inserções são feitas exclusivamente via este script (service role).

-- 4. INSERIR O ADMINISTRADOR EXISTENTE
-- Idempotente: não faz nada se já existir.
insert into public.admins (id, email, nome, ativo)
values (
    '5a73813a-22ac-40ef-abf5-908d47406853',
    'admin@helpgo.com',
    'Administrador HelpGo',
    true
)
on conflict (id) do update
    set email = excluded.email,
        nome  = excluded.nome,
        ativo = excluded.ativo;

-- 5. GARANTIR QUE O ADMIN ESTEJA NA TABELA USUARIOS COM TIPO 'admin'
insert into public.usuarios (id, nome, email, tipo)
values (
    '5a73813a-22ac-40ef-abf5-908d47406853',
    'Administrador HelpGo',
    'admin@helpgo.com',
    'admin'
)
on conflict (id) do update
    set tipo = 'admin',
        nome = 'Administrador HelpGo';

-- =======================================================
-- 6. POLÍTICAS RLS PARA O PAINEL ADMIN
-- O admin precisa ler dados de: usuarios, prestadores, solicitacoes, servicos
-- =======================================================

-- USUARIOS: admin pode ler todos
drop policy if exists "admin_le_todos_usuarios" on public.usuarios;
create policy "admin_le_todos_usuarios"
on public.usuarios for select
to authenticated
using (
    -- Admin lê tudo, outros usuários leem apenas prestadores ou o próprio registro
    exists (select 1 from public.admins a where a.id = auth.uid())
    or tipo = 'prestador'
    or id = auth.uid()
);

-- PRESTADORES: admin pode ler todos (incluindo inativos)
drop policy if exists "admin_le_todos_prestadores" on public.prestadores;
create policy "admin_le_todos_prestadores"
on public.prestadores for select
to authenticated
using (
    exists (select 1 from public.admins a where a.id = auth.uid())
    or true  -- as políticas existentes já permitem leitura pública
);

-- SOLICITACOES: admin pode ler todas
drop policy if exists "admin_le_todas_solicitacoes" on public.solicitacoes;
create policy "admin_le_todas_solicitacoes"
on public.solicitacoes for select
to authenticated
using (
    exists (select 1 from public.admins a where a.id = auth.uid())
    or cliente_id = auth.uid()
    or prestador_id = auth.uid()
    or (status = 'aberto' and exists (
        select 1 from public.prestadores p where p.id = auth.uid()
    ))
);
