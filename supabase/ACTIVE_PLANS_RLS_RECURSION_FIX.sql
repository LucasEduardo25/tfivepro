-- TFIVE PRO — corrigir recursão RLS entre active_plans e plan_participants
-- Aplicar primeiro no STAGING. Não executar em produção sem revisão e autorização.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.student_can_view_active_plan(p_plan_id uuid, p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
  select auth.uid() is not null and exists (
    select 1
    from public.plan_participants pp
    join public.student_access sa
      on sa.student_id = pp.student_id
     and sa.organization_id = p_org_id
    where pp.active_plan_id = p_plan_id
      and pp.student_id is not null
      and sa.user_id = auth.uid()
      and sa.enabled = true
      and sa.status = 'ACTIVE'
  );
$function$;

create or replace function private.trainer_can_manage_plan_participant(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
  select auth.uid() is not null and exists (
    select 1
    from public.active_plans ap
    join public.organization_members om
      on om.organization_id = ap.organization_id
    where ap.id = p_plan_id
      and om.user_id = auth.uid()
      and om.role in ('OWNER', 'TRAINER')
      and om.status = 'active'
  );
$function$;

revoke all on function private.student_can_view_active_plan(uuid, uuid) from public, anon;
revoke all on function private.trainer_can_manage_plan_participant(uuid) from public, anon;
grant execute on function private.student_can_view_active_plan(uuid, uuid) to authenticated;
grant execute on function private.trainer_can_manage_plan_participant(uuid) to authenticated;

drop policy if exists "Students can view their active plan info" on public.active_plans;
create policy "Students can view their active plan info"
on public.active_plans
for select
to authenticated
using (private.student_can_view_active_plan(id, organization_id));

drop policy if exists "Trainers can manage active plans" on public.active_plans;
create policy "Trainers can manage active plans"
on public.active_plans
for all
to authenticated
using (public.is_trainer(organization_id))
with check (public.is_trainer(organization_id));

drop policy if exists "Trainers can manage plan participants" on public.plan_participants;
create policy "Trainers can manage plan participants"
on public.plan_participants
for all
to authenticated
using (private.trainer_can_manage_plan_participant(active_plan_id))
with check (private.trainer_can_manage_plan_participant(active_plan_id));

commit;
