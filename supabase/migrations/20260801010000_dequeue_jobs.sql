-- PostgREST no expone `SELECT ... FOR UPDATE SKIP LOCKED` directo (cada
-- request es su propia transacción sin control de locking desde el
-- cliente) — por eso el drenador de la cola (lib/queue/drain.ts) llama a
-- esta función vía RPC en vez de hacer un SELECT + UPDATE normal desde
-- supabase-js, que tendría una condición de carrera entre dos invocaciones
-- concurrentes del drenador tomando el mismo job.
create or replace function public.dequeue_jobs(p_lote int default 10)
returns setof public.job_queue
language plpgsql
as $$
begin
  return query
  update public.job_queue
  set estado = 'procesando'
  where id in (
    select id from public.job_queue
    where estado = 'pendiente' and disponible_en <= now()
    order by created_at
    limit p_lote
    for update skip locked
  )
  returning *;
end;
$$;

-- Solo el backend (drenador) puede llamar esto — no se expone a authenticated/anon.
revoke execute on function public.dequeue_jobs(int) from public;
grant execute on function public.dequeue_jobs(int) to service_role;
