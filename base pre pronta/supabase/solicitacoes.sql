-- HelpGo: solicitações reais e políticas de acesso.
-- Execute este arquivo no SQL Editor do projeto Supabase antes de publicar a alteração.

create table if not exists public.solicitacoes (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references auth.users(id) on delete cascade,
    prestador_id uuid references auth.users(id) on delete set null,
    servico text not null,
    servico_id uuid null,
    descricao text not null check (char_length(descricao) between 1 and 500),
    cep text,
    endereco text,
    urgencia text not null default 'normal' check (urgencia in ('normal', 'urgente', 'emergencia')),
    orcamento text,
    data_agendada text,
    status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'concluido', 'avaliado', 'cancelado')),
    avaliacao_nota numeric(2,1) check (avaliacao_nota between 1 and 5),
    avaliacao_comentario text,
    avaliacao_tag text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists solicitacoes_cliente_id_idx on public.solicitacoes(cliente_id, created_at desc);
create index if not exists solicitacoes_prestador_id_idx on public.solicitacoes(prestador_id, created_at desc);
create index if not exists solicitacoes_status_idx on public.solicitacoes(status);

alter table public.solicitacoes enable row level security;

-- O cliente cria somente solicitações associadas à própria sessão.
create policy "cliente cria propria solicitacao"
on public.solicitacoes for insert to authenticated
with check (cliente_id = auth.uid() and prestador_id is null and status = 'aberto');

-- Cliente vê apenas o que criou. Prestador vê chamados abertos e os que aceitou.
create policy "participantes leem solicitacoes permitidas"
on public.solicitacoes for select to authenticated
using (
    cliente_id = auth.uid()
    or prestador_id = auth.uid()
    or (status = 'aberto' and exists (
        select 1 from public.prestadores p where p.id = auth.uid()
    ))
);

-- Um prestador só pode assumir chamado aberto ou atualizar chamado já atribuído a ele.
create policy "prestador atualiza chamados permitidos"
on public.solicitacoes for update to authenticated
using (
    (status = 'aberto' and exists (select 1 from public.prestadores p where p.id = auth.uid()))
    or prestador_id = auth.uid()
)
with check (
    prestador_id = auth.uid()
    and status in ('em_andamento', 'concluido')
);

-- Cliente só pode registrar avaliação após a conclusão de uma solicitação própria.
create policy "cliente avalia solicitacao concluida"
on public.solicitacoes for update to authenticated
using (cliente_id = auth.uid() and status = 'concluido')
with check (cliente_id = auth.uid() and status = 'avaliado');
