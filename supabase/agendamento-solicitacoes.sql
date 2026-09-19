-- Executar no SQL Editor do projeto Supabase usado pelo site.
-- Dia e hora locais do atendimento; pedidos anteriores continuam sem agendamento.
begin;
alter table public.solicitacoes
    add column if not exists data_agendada date,
    add column if not exists horario_agendado time(0) without time zone;
notify pgrst, 'reload schema';
commit;
