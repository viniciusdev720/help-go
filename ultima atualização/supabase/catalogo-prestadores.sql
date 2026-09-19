-- Instalar no SQL Editor do projeto configurado em js/config/supabase.js.
-- Não depende de separar-perfis.sql e não cria prestadores de demonstração.
begin;

create schema if not exists helpgo_catalogo;
revoke all on schema helpgo_catalogo from public, anon;
grant usage on schema helpgo_catalogo to authenticated;

-- Leitura privilegiada necessária para verificar a existência da conta no Auth
-- e projetar SOMENTE seus dados profissionais, sem liberar as tabelas privadas.
-- Manter este schema fora dos schemas expostos pela Data API.
create or replace function helpgo_catalogo.listar_prestadores(p_id uuid default null)
returns setof jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
    if auth.uid() is null or not exists (
        select 1 from auth.users leitor
        where leitor.id = auth.uid() and leitor.is_anonymous = false
    ) then
        raise exception 'Autenticação necessária.' using errcode = '42501';
    end if;

    return query
    select jsonb_build_object(
        'id', a.id,
        'telefone', coalesce(nullif(trim(u.telefone), ''), nullif(trim(a.raw_user_meta_data->>'telefone'), '')),
        'usuarios', jsonb_build_object('nome', coalesce(
            nullif(trim(u.nome), ''),
            nullif(trim(a.raw_user_meta_data->>'nome'), ''),
            'Nome não informado'
        )),
        'bio', coalesce(to_jsonb(p)->>'bio', a.raw_user_meta_data->>'descricao'),
        'descricao', to_jsonb(p)->>'descricao',
        'preco', to_jsonb(p)->'preco',
        'foto_url', to_jsonb(p)->>'foto_url',
        'ativo', coalesce(p.ativo, false),
        'prestador_servicos', coalesce(
            (
                select jsonb_agg(jsonb_build_object(
                    'servico_id', s.id,
                    'servicos', jsonb_build_object('id', s.id, 'nome', s.nome)
                ) order by s.nome)
                from public.prestador_servicos ps
                join public.servicos s on s.id = ps.servico_id
                where ps.prestador_id = a.id
            ),
            -- Cadastros antigos podem ter salvo a profissão apenas no Auth.
            -- Esse texto é descritivo: não concede permissões nem muda o tipo da conta.
            case when nullif(trim(a.raw_user_meta_data->>'categoria'), '') is not null
                then jsonb_build_array(jsonb_build_object('servicos', jsonb_build_object(
                    'id', null, 'nome', trim(a.raw_user_meta_data->>'categoria')
                )))
                else '[]'::jsonb
            end
        )
    )
    from auth.users a
    left join public.usuarios u on u.id = a.id
    left join public.prestadores p on p.id = a.id
    -- O tipo persistido prevalece. Metadados de cadastros incompletos são usados
    -- somente para inclusão no catálogo, nunca para autorizar ações da conta.
    where coalesce(u.tipo::text, a.raw_user_meta_data->>'tipo') = 'prestador'
        and a.is_anonymous = false
        and (p_id is null or a.id = p_id)
        and not exists (
            select 1 from public.admins ad
            where coalesce(to_jsonb(ad)->>'usuario_id', to_jsonb(ad)->>'id') = a.id::text
        )
    order by coalesce(nullif(trim(u.nome), ''), a.raw_user_meta_data->>'nome', ''), a.id;
end;
$$;

revoke all on function helpgo_catalogo.listar_prestadores(uuid) from public, anon;
grant execute on function helpgo_catalogo.listar_prestadores(uuid) to authenticated;

create or replace function public.helpgo_listar_prestadores(p_id uuid default null)
returns setof jsonb
language sql stable security invoker set search_path = ''
as $$ select * from helpgo_catalogo.listar_prestadores(p_id); $$;

revoke all on function public.helpgo_listar_prestadores(uuid) from public, anon;
grant execute on function public.helpgo_listar_prestadores(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
