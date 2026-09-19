-- HelpGo: perfis de acesso separados. Executar no SQL Editor antes de ativar.
-- usuarios e prestadores são mantidas para os vínculos operacionais existentes.
-- Senhas e sessões continuam exclusivamente em auth.users / Supabase Auth.
begin;

create table if not exists public.clientes (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    email text not null,
    telefone text,
    cpf text,
    created_at timestamptz not null default now()
);

create table if not exists public.prestador (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    email text not null,
    telefone text,
    cpf text,
    created_at timestamptz not null default now()
);

-- Compatível com as variantes id e usuario_id da tabela admins.
create or replace function public.helpgo_admin_atual()
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.admins a
        where coalesce(to_jsonb(a)->>'usuario_id', to_jsonb(a)->>'id') = auth.uid()::text
        and a.ativo = true
    );
$$;
revoke all on function public.helpgo_admin_atual() from public;
grant execute on function public.helpgo_admin_atual() to authenticated;

alter table public.clientes enable row level security;
alter table public.prestador enable row level security;
revoke all on public.clientes, public.prestador from anon, authenticated;
grant select on public.clientes, public.prestador to authenticated;
grant all on public.clientes, public.prestador to service_role;

drop policy if exists clientes_leitura on public.clientes;
create policy clientes_leitura on public.clientes for select to authenticated
using (id = auth.uid() or public.helpgo_admin_atual());
drop policy if exists prestador_leitura on public.prestador;
create policy prestador_leitura on public.prestador for select to authenticated
using (id = auth.uid() or public.helpgo_admin_atual());

-- O navegador não pode mudar o tipo de uma conta existente nem criar admins.
create or replace function public.helpgo_proteger_tipo()
returns trigger language plpgsql set search_path = '' as $$
begin
    if current_user in ('anon', 'authenticated') then
        if tg_op = 'INSERT' then
            if new.id is distinct from auth.uid() or new.tipo not in ('cliente', 'prestador') then
                raise exception 'Tipo de conta não permitido.';
            end if;
        elsif new.tipo is distinct from old.tipo or new.id is distinct from old.id then
            raise exception 'O tipo e a identidade da conta não podem ser alterados.';
        end if;
    end if;
    return new;
end;
$$;
drop trigger if exists helpgo_proteger_tipo on public.usuarios;
create trigger helpgo_proteger_tipo before insert or update on public.usuarios
for each row execute function public.helpgo_proteger_tipo();

-- Sincronização em uma direção: cadastro operacional -> perfil privado.
-- Perfis demonstrativos sem conta no Auth não são migrados como contas reais.
create or replace function public.helpgo_sincronizar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if not exists (select 1 from auth.users where id = new.id) then
        return new;
    end if;
    if new.tipo = 'cliente' then
        if exists (select 1 from public.prestador where id = new.id) then
            raise exception 'Conta já cadastrada como prestador.';
        end if;
        insert into public.clientes (id, nome, email, telefone, cpf)
        values (new.id, new.nome, new.email, new.telefone, new.cpf)
        on conflict (id) do update set nome = excluded.nome, email = excluded.email,
            telefone = excluded.telefone, cpf = excluded.cpf;
    elsif new.tipo = 'prestador' then
        if exists (select 1 from public.clientes where id = new.id) then
            raise exception 'Conta já cadastrada como cliente.';
        end if;
        insert into public.prestador (id, nome, email, telefone, cpf)
        values (new.id, new.nome, new.email, new.telefone, new.cpf)
        on conflict (id) do update set nome = excluded.nome, email = excluded.email,
            telefone = excluded.telefone, cpf = excluded.cpf;
    end if;
    return new;
end;
$$;
revoke all on function public.helpgo_sincronizar_perfil() from public;
drop trigger if exists helpgo_sincronizar_perfil on public.usuarios;
create trigger helpgo_sincronizar_perfil after insert or update on public.usuarios
for each row execute function public.helpgo_sincronizar_perfil();

-- Recupera contas cujo cadastro antigo criou o Auth, mas não concluiu o perfil.
insert into public.usuarios (id, nome, email, telefone, cpf, tipo)
select a.id, coalesce(nullif(a.raw_user_meta_data->>'nome', ''), split_part(a.email, '@', 1)),
    a.email, a.raw_user_meta_data->>'telefone', a.raw_user_meta_data->>'cpf',
    a.raw_user_meta_data->>'tipo'
from auth.users a
where a.raw_user_meta_data->>'tipo' in ('cliente', 'prestador')
    and a.email is not null
    and not exists (
        select 1 from public.admins ad
        where coalesce(to_jsonb(ad)->>'usuario_id', to_jsonb(ad)->>'id') = a.id::text
    )
on conflict (id) do nothing;

insert into public.clientes (id, nome, email, telefone, cpf, created_at)
select u.id, u.nome, u.email, u.telefone, u.cpf, a.created_at
from public.usuarios u join auth.users a on a.id = u.id where u.tipo = 'cliente'
on conflict (id) do nothing;

insert into public.prestador (id, nome, email, telefone, cpf, created_at)
select u.id, u.nome, u.email, u.telefone, u.cpf, a.created_at
from public.usuarios u join auth.users a on a.id = u.id where u.tipo = 'prestador'
on conflict (id) do nothing;

insert into public.prestadores (id, ativo)
select p.id, false from public.prestador p
on conflict (id) do nothing;

-- Todo o cadastro é gravado na mesma transação do Auth, mesmo sem sessão
-- (quando a confirmação de e-mail está ativada).
create or replace function public.helpgo_cadastrar_conta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    dados jsonb := new.raw_user_meta_data;
    categoria_id public.servicos.id%type;
begin
    if dados->>'cadastro_helpgo' is distinct from '2' then
        return new;
    end if;
    if coalesce(dados->>'tipo', '') not in ('cliente', 'prestador') then
        raise exception 'Tipo de conta inválido.';
    end if;
    if nullif(trim(dados->>'nome'), '') is null then
        raise exception 'Nome obrigatório.';
    end if;

    insert into public.usuarios (id, nome, email, telefone, cpf, tipo)
    values (new.id, dados->>'nome', new.email, dados->>'telefone', dados->>'cpf', dados->>'tipo')
    on conflict (id) do update set nome = excluded.nome, email = excluded.email,
        telefone = excluded.telefone, cpf = excluded.cpf, tipo = excluded.tipo;

    if dados->>'tipo' = 'prestador' then
        select id into categoria_id from public.servicos
        where nome ilike '%' || (dados->>'categoria') || '%' order by nome limit 1;
        if categoria_id is null then
            raise exception 'Categoria de serviço não disponível.';
        end if;
        insert into public.prestadores (id, bio, descricao, ativo)
        values (new.id, dados->>'descricao', dados->>'descricao', true)
        on conflict (id) do nothing;
        insert into public.prestador_servicos (prestador_id, servico_id)
        values (new.id, categoria_id) on conflict do nothing;
    end if;

    if not exists (select 1 from public.enderecos where usuario_id = new.id) then
        insert into public.enderecos (usuario_id, cep, estado, cidade, bairro, rua, numero)
        values (new.id, dados->>'cep', dados->>'estado', dados->>'cidade',
            coalesce(dados->>'bairro', ''), dados->>'endereco', dados->>'numero');
    end if;
    return new;
end;
$$;
revoke all on function public.helpgo_cadastrar_conta() from public;
drop trigger if exists zz_helpgo_cadastrar_conta on auth.users;
create trigger zz_helpgo_cadastrar_conta after insert on auth.users
for each row execute function public.helpgo_cadastrar_conta();

-- Sinaliza ao frontend que o cadastro transacional está instalado.
create or replace function public.helpgo_versao_perfis()
returns integer language sql immutable set search_path = '' as $$ select 2; $$;
revoke all on function public.helpgo_versao_perfis() from public;
grant execute on function public.helpgo_versao_perfis() to anon, authenticated;

do $$
begin
    if exists (select 1 from public.clientes c join public.prestador p using (id)) then
        raise exception 'Migração cancelada: há contas presentes nos dois perfis.';
    end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
