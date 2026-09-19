-- =======================================================
-- HELPGO: EXIBIÇÃO DE PRESTADORES, DISPONIBILIDADE E PERFIS
-- Execute este script no SQL Editor do seu projeto Supabase.
-- =======================================================

-- 1. ADICIONAR COLUNAS COMPLEMENTARES CASO NÃO EXISTAM
alter table if exists public.prestadores
    add column if not exists foto_url text,
    add column if not exists valor_minimo numeric(10,2),
    add column if not exists verificado boolean not null default false,
    add column if not exists servicos_realizados integer not null default 0,
    add column if not exists status text not null default 'disponivel';

alter table if exists public.usuarios
    add column if not exists foto_url text;

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
alter table if exists public.usuarios enable row level security;
alter table if exists public.prestadores enable row level security;
alter table if exists public.enderecos enable row level security;
alter table if exists public.servicos enable row level security;
alter table if exists public.prestador_servicos enable row level security;

-- 3. POLÍTICAS DE ACESSO: PRESTADORES
-- Qualquer usuário (cliente autenticado ou visitante) pode consultar os prestadores
drop policy if exists "prestadores_leitura_publica" on public.prestadores;
create policy "prestadores_leitura_publica"
on public.prestadores for select
to anon, authenticated
using (true);

-- O próprio prestador pode atualizar seus dados e seu status de disponibilidade
drop policy if exists "prestador_atualiza_proprio_status" on public.prestadores;
create policy "prestador_atualiza_proprio_status"
on public.prestadores for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- O prestador pode inserir seu próprio registro de prestador
drop policy if exists "prestador_insere_proprio_registro" on public.prestadores;
create policy "prestador_insere_proprio_registro"
on public.prestadores for insert
to authenticated
with check (id = auth.uid());

-- 4. POLÍTICAS DE ACESSO: USUÁRIOS
-- Perfis públicos de prestadores podem ser lidos para compor os cards de profissionais.
-- Clientes também leem seus próprios dados.
drop policy if exists "usuarios_leitura_prestadores_ou_proprio" on public.usuarios;
create policy "usuarios_leitura_prestadores_ou_proprio"
on public.usuarios for select
to anon, authenticated
using (tipo = 'prestador' or id = auth.uid());

-- O próprio usuário pode atualizar seus dados cadastrais
drop policy if exists "usuario_atualiza_proprio_perfil" on public.usuarios;
create policy "usuario_atualiza_proprio_perfil"
on public.usuarios for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- O próprio usuário pode inserir seu registro na tabela usuarios
drop policy if exists "usuario_insere_proprio_registro" on public.usuarios;
create policy "usuario_insere_proprio_registro"
on public.usuarios for insert
to authenticated
with check (id = auth.uid());

-- 5. POLÍTICAS DE ACESSO: ENDEREÇOS
drop policy if exists "enderecos_leitura_publica" on public.enderecos;
create policy "enderecos_leitura_publica"
on public.enderecos for select
to anon, authenticated
using (true);

drop policy if exists "enderecos_gerencia_proprio" on public.enderecos;
create policy "enderecos_gerencia_proprio"
on public.enderecos for all
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- 6. POLÍTICAS DE ACESSO: SERVIÇOS E ESPECIALIDADES
drop policy if exists "servicos_leitura_publica" on public.servicos;
create policy "servicos_leitura_publica"
on public.servicos for select
to anon, authenticated
using (true);

drop policy if exists "prestador_servicos_leitura_publica" on public.prestador_servicos;
create policy "prestador_servicos_leitura_publica"
on public.prestador_servicos for select
to anon, authenticated
using (true);

drop policy if exists "prestador_servicos_gerencia_proprio" on public.prestador_servicos;
create policy "prestador_servicos_gerencia_proprio"
on public.prestador_servicos for all
to authenticated
using (prestador_id = auth.uid())
with check (prestador_id = auth.uid());

-- 7. VIEW CENTRALIZADA: prestadores_publicos
-- Reúne dados consolidados do prestador para rápida renderização no frontend
create or replace view public.prestadores_publicos as
select
    p.id,
    u.nome,
    u.email,
    u.telefone,
    coalesce(p.foto_url, u.foto_url) as foto_url,
    p.descricao,
    p.avaliacao,
    p.total_avaliacoes,
    p.ativo,
    coalesce(p.status, case when p.ativo then 'disponivel' else 'offline' end) as status,
    coalesce(p.verificado, false) as verificado,
    p.valor_minimo as valor,
    coalesce(p.servicos_realizados, 0) as servicos_realizados,
    p.created_at,
    e.cidade,
    e.estado,
    coalesce(
        (
            select json_agg(
                json_build_object(
                    'id', s.id,
                    'nome', s.nome,
                    'descricao', s.descricao,
                    'experiencia', ps.experiencia
                )
            )
            from public.prestador_servicos ps
            join public.servicos s on s.id = ps.servico_id
            where ps.prestador_id = p.id
        ),
        '[]'::json
    ) as servicos
from public.prestadores p
join public.usuarios u on u.id = p.id
left join public.enderecos e on e.usuario_id = p.id;

grant select on public.prestadores_publicos to anon, authenticated;

-- 8. CARGA INICIAL DE SERVIÇOS (SEED)
insert into public.servicos (nome, descricao)
values
    ('Eletricista', 'Instalações elétricas, quadros, tomadas, chuveiros e iluminação residencial e comercial.'),
    ('Encanador', 'Reparos hidráulicos, vazamentos, torneiras, registros e caixas d''água.'),
    ('Pintor', 'Pintura residencial e comercial, restaurações, massa corrida e texturas.'),
    ('Marceneiro', 'Montagem de móveis planejados, consertos em madeira e instalações.'),
    ('Ar-condicionado', 'Instalação, limpeza, higienização e manutenção preventiva e corretiva.')
on conflict do nothing;

-- 9. PRESTADORES DE EXEMPLO REAIS NO BANCO (Conforme tarefa.md)
-- Inserção idempotente com UUIDs determinísticos para testes e demonstração
do $$
declare
    v_eletricista_id uuid;
    v_encanador_id uuid;
    v_pintor_id uuid;
    v_marceneiro_id uuid;
    v_ar_id uuid;
begin
    select id into v_eletricista_id from public.servicos where nome ilike '%Eletricista%' limit 1;
    select id into v_encanador_id from public.servicos where nome ilike '%Encanador%' limit 1;
    select id into v_pintor_id from public.servicos where nome ilike '%Pintor%' limit 1;
    select id into v_marceneiro_id from public.servicos where nome ilike '%Marceneiro%' limit 1;
    select id into v_ar_id from public.servicos where nome ilike '%Ar-condicionado%' limit 1;

    -- 1. Carlos Silva (Eletricista)
    insert into public.usuarios (id, nome, email, telefone, tipo)
    values ('11111111-1111-1111-1111-111111111101', 'Carlos Silva', 'carlos.silva@helpgo.com', '(11) 98765-4321', 'prestador')
    on conflict (id) do update set nome = excluded.nome, tipo = 'prestador';

    insert into public.prestadores (id, descricao, avaliacao, total_avaliacoes, ativo, status, verificado, valor_minimo, servicos_realizados)
    values ('11111111-1111-1111-1111-111111111101', 'Eletricista especializado em instalações residenciais e comerciais com mais de 10 anos de experiência.', 4.9, 42, true, 'disponivel', true, 90.00, 58)
    on conflict (id) do update set
        descricao = excluded.descricao,
        avaliacao = excluded.avaliacao,
        total_avaliacoes = excluded.total_avaliacoes,
        ativo = excluded.ativo,
        status = excluded.status,
        verificado = excluded.verificado,
        valor_minimo = excluded.valor_minimo,
        servicos_realizados = excluded.servicos_realizados;

    insert into public.enderecos (usuario_id, cidade, estado, rua, numero, cep)
    values ('11111111-1111-1111-1111-111111111101', 'São Paulo', 'SP', 'Av. Paulista', '1000', '01310-100')
    on conflict do nothing;

    if v_eletricista_id is not null then
        insert into public.prestador_servicos (prestador_id, servico_id, experiencia)
        values ('11111111-1111-1111-1111-111111111101', v_eletricista_id, 'Instalações elétricas residenciais e quadros de distribuição')
        on conflict do nothing;
    end if;

    -- 2. Roberto Alves (Encanador)
    insert into public.usuarios (id, nome, email, telefone, tipo)
    values ('11111111-1111-1111-1111-111111111102', 'Roberto Alves', 'roberto.alves@helpgo.com', '(11) 97654-3210', 'prestador')
    on conflict (id) do update set nome = excluded.nome, tipo = 'prestador';

    insert into public.prestadores (id, descricao, avaliacao, total_avaliacoes, ativo, status, verificado, valor_minimo, servicos_realizados)
    values ('11111111-1111-1111-1111-111111111102', 'Encanador profissional, localização de vazamentos não destrutiva e desentupimento geral.', 4.8, 29, true, 'disponivel', true, 85.00, 37)
    on conflict (id) do update set
        descricao = excluded.descricao,
        avaliacao = excluded.avaliacao,
        total_avaliacoes = excluded.total_avaliacoes,
        ativo = excluded.ativo,
        status = excluded.status,
        verificado = excluded.verificado,
        valor_minimo = excluded.valor_minimo,
        servicos_realizados = excluded.servicos_realizados;

    insert into public.enderecos (usuario_id, cidade, estado, rua, numero, cep)
    values ('11111111-1111-1111-1111-111111111102', 'São Paulo', 'SP', 'Rua Domingos de Morais', '500', '04010-000')
    on conflict do nothing;

    if v_encanador_id is not null then
        insert into public.prestador_servicos (prestador_id, servico_id, experiencia)
        values ('11111111-1111-1111-1111-111111111102', v_encanador_id, 'Manutenção hidráulica geral e desentupimentos')
        on conflict do nothing;
    end if;

    -- 3. Marcos Souza (Pintor)
    insert into public.usuarios (id, nome, email, telefone, tipo)
    values ('11111111-1111-1111-1111-111111111103', 'Marcos Souza', 'marcos.souza@helpgo.com', '(11) 96543-2109', 'prestador')
    on conflict (id) do update set nome = excluded.nome, tipo = 'prestador';

    insert into public.prestadores (id, descricao, avaliacao, total_avaliacoes, ativo, status, verificado, valor_minimo, servicos_realizados)
    values ('11111111-1111-1111-1111-111111111103', 'Pintor experiente com acabamento de alto padrão, aplicação de massas e pintura decorativa.', 4.7, 18, true, 'disponivel', false, 120.00, 24)
    on conflict (id) do update set
        descricao = excluded.descricao,
        avaliacao = excluded.avaliacao,
        total_avaliacoes = excluded.total_avaliacoes,
        ativo = excluded.ativo,
        status = excluded.status,
        verificado = excluded.verificado,
        valor_minimo = excluded.valor_minimo,
        servicos_realizados = excluded.servicos_realizados;

    insert into public.enderecos (usuario_id, cidade, estado, rua, numero, cep)
    values ('11111111-1111-1111-1111-111111111103', 'Santo André', 'SP', 'Rua das Figueiras', '320', '09080-300')
    on conflict do nothing;

    if v_pintor_id is not null then
        insert into public.prestador_servicos (prestador_id, servico_id, experiencia)
        values ('11111111-1111-1111-1111-111111111103', v_pintor_id, 'Pintura residencial interna e externa')
        on conflict do nothing;
    end if;

    -- 4. Juliana Lima (Marceneiro / Montadora)
    insert into public.usuarios (id, nome, email, telefone, tipo)
    values ('11111111-1111-1111-1111-111111111104', 'Juliana Lima', 'juliana.lima@helpgo.com', '(11) 95432-1098', 'prestador')
    on conflict (id) do update set nome = excluded.nome, tipo = 'prestador';

    insert into public.prestadores (id, descricao, avaliacao, total_avaliacoes, ativo, status, verificado, valor_minimo, servicos_realizados)
    values ('11111111-1111-1111-1111-111111111104', 'Montadora de móveis e marcenaria fina. Montagem rápida com ferramentas adequadas.', 5.0, 36, true, 'disponivel', true, 95.00, 48)
    on conflict (id) do update set
        descricao = excluded.descricao,
        avaliacao = excluded.avaliacao,
        total_avaliacoes = excluded.total_avaliacoes,
        ativo = excluded.ativo,
        status = excluded.status,
        verificado = excluded.verificado,
        valor_minimo = excluded.valor_minimo,
        servicos_realizados = excluded.servicos_realizados;

    insert into public.enderecos (usuario_id, cidade, estado, rua, numero, cep)
    values ('11111111-1111-1111-1111-111111111104', 'São Bernardo do Campo', 'SP', 'Rua Marechal Deodoro', '850', '09710-000')
    on conflict do nothing;

    if v_marceneiro_id is not null then
        insert into public.prestador_servicos (prestador_id, servico_id, experiencia)
        values ('11111111-1111-1111-1111-111111111104', v_marceneiro_id, 'Montagem e reparos de móveis')
        on conflict do nothing;
    end if;

    -- 5. André Costa (Ar-condicionado)
    insert into public.usuarios (id, nome, email, telefone, tipo)
    values ('11111111-1111-1111-1111-111111111105', 'André Costa', 'andre.costa@helpgo.com', '(11) 94321-0987', 'prestador')
    on conflict (id) do update set nome = excluded.nome, tipo = 'prestador';

    insert into public.prestadores (id, descricao, avaliacao, total_avaliacoes, ativo, status, verificado, valor_minimo, servicos_realizados)
    values ('11111111-1111-1111-1111-111111111105', 'Técnico certificado em climatização. Instalação, higienização profunda e consertos.', 4.9, 51, true, 'disponivel', true, 150.00, 64)
    on conflict (id) do update set
        descricao = excluded.descricao,
        avaliacao = excluded.avaliacao,
        total_avaliacoes = excluded.total_avaliacoes,
        ativo = excluded.ativo,
        status = excluded.status,
        verificado = excluded.verificado,
        valor_minimo = excluded.valor_minimo,
        servicos_realizados = excluded.servicos_realizados;

    insert into public.enderecos (usuario_id, cidade, estado, rua, numero, cep)
    values ('11111111-1111-1111-1111-111111111105', 'São Paulo', 'SP', 'Rua Vergueiro', '1500', '04101-000')
    on conflict do nothing;

    if v_ar_id is not null then
        insert into public.prestador_servicos (prestador_id, servico_id, experiencia)
        values ('11111111-1111-1111-1111-111111111105', v_ar_id, 'Instalação e higienização de ar-condicionado')
        on conflict do nothing;
    end if;

end $$;
