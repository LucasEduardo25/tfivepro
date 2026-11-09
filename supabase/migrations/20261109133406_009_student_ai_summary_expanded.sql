-- Migration 009: resumo anonimizado ampliado para o TFIVE Intelligence.
-- SECURITY INVOKER preserva a aplicação das políticas RLS do usuário chamador.
CREATE OR REPLACE FUNCTION public.get_student_ai_summary(p_student_id uuid, p_weeks integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_weeks integer := least(greatest(coalesce(p_weeks, 8), 1), 26);
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start date;
  v_student record;
  v_age integer;
  v_age_band text;
  v_result jsonb;
begin
  v_start := v_today
    - (extract(isodow from v_today)::int - 1)
    - ((v_weeks - 1) * 7);

  -- A linha só existe aqui se as políticas RLS autorizarem o usuário atual.
  select s.goal, s.modality, s.status, s.birth_date, s.start_date
    into v_student
    from public.students s
   where s.id = p_student_id;

  if not found then
    return null;
  end if;

  if v_student.birth_date is not null then
    v_age := extract(year from age(v_today, v_student.birth_date))::int;
    v_age_band := ((v_age / 10) * 10)::text || '-' ||
                  (((v_age / 10) * 10) + 9)::text;
  end if;

  with weeks as (
    select (v_start + (g * 7))::date as week_start
    from generate_series(0, v_weeks - 1) as g
  ),
  agenda as (
    select
      (e.date - (extract(isodow from e.date)::int - 1))::date as week_start,
      count(*) as scheduled_total,
      count(*) filter (where lower(e.status) = 'completed') as completed,
      count(*) filter (where lower(e.status) = 'missed') as missed,
      count(*) filter (where lower(e.status) = 'cancelled') as cancelled
    from public.schedule_events e
    where e.student_id = p_student_id
      and e.date between v_start and v_today
    group by 1
  ),
  session_base as (
    select
      (s.start_time at time zone 'America/Sao_Paulo')::date as day,
      coalesce(s.total_volume, 0) as total_volume,
      coalesce(s.total_sets, 0) as total_sets,
      s.duration_seconds,
      s.student_rating
    from public.sessions s
    where s.student_id = p_student_id
      and s.status = 'completed'
      and (s.start_time at time zone 'America/Sao_Paulo')::date >= v_start
      and (s.start_time at time zone 'America/Sao_Paulo')::date <= v_today
  ),
  session_week as (
    select
      (b.day - (extract(isodow from b.day)::int - 1))::date as week_start,
      count(*) as sessions_done,
      round(sum(b.total_volume)) as volume,
      sum(b.total_sets)::integer as sets,
      round(avg(b.duration_seconds) / 60.0) as avg_duration_min,
      round(avg(b.student_rating), 1) as avg_student_rating
    from session_base b
    group by 1
  ),
  weekly_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'semana_inicio', w.week_start,
          'treinos_agendados', coalesce(a.scheduled_total, 0),
          'treinos_realizados', coalesce(sw.sessions_done, 0),
          'agendados_concluidos', coalesce(a.completed, 0),
          'faltas', coalesce(a.missed, 0),
          'cancelados', coalesce(a.cancelled, 0),
          'volume_total_kg_reps', coalesce(sw.volume, 0),
          'series_totais', coalesce(sw.sets, 0),
          'duracao_media_min', sw.avg_duration_min,
          'satisfacao_media', sw.avg_student_rating
        ) order by w.week_start
      ),
      '[]'::jsonb
    ) as data
    from weeks w
    left join agenda a on a.week_start = w.week_start
    left join session_week sw on sw.week_start = w.week_start
  ),
  session_totals as (
    select jsonb_build_object(
      'treinos_concluidos', (select count(*) from session_base),
      'media_treinos_por_semana',
        round((select count(*) from session_base)::numeric / v_weeks, 1),
      'volume_total_kg_reps', (select round(coalesce(sum(total_volume), 0)) from session_base),
      'series_totais', (select coalesce(sum(total_sets), 0) from session_base),
      'duracao_media_min', (select round(avg(duration_seconds) / 60.0) from session_base),
      'satisfacao_media', (select round(avg(student_rating), 1) from session_base),
      'agendados_concluidos', (select coalesce(sum(completed), 0) from agenda),
      'faltas', (select coalesce(sum(missed), 0) from agenda),
      'cancelados', (select coalesce(sum(cancelled), 0) from agenda)
    ) as data
  ),
  set_by_day as (
    select
      se.exercise_name_snapshot as exercise_name,
      se.muscle_group_snapshot as muscle_group,
      (s.start_time at time zone 'America/Sao_Paulo')::date as day,
      max(ss.weight_kg) as max_weight_kg,
      sum(coalesce(ss.weight_kg, 0) * coalesce(ss.actual_reps, 0)) as volume,
      round(avg(ss.rpe), 1) as avg_rpe,
      count(*)::integer as set_count,
      max(ss.actual_reps) as max_reps
    from public.sessions s
    join public.session_exercises se on se.session_id = s.id
    join public.session_sets ss on ss.session_exercise_id = se.id
    where s.student_id = p_student_id
      and s.status = 'completed'
      and (s.start_time at time zone 'America/Sao_Paulo')::date between v_start and v_today
      and ss.status = 'completed'
      and not coalesce(ss.is_warmup, false)
    group by 1, 2, 3
  ),
  top_exercises as (
    select exercise_name
    from set_by_day
    group by exercise_name
    order by sum(set_count) desc
    limit 8
  ),
  progression as (
    select
      d.exercise_name,
      max(d.muscle_group) as muscle_group,
      count(*)::integer as sessions_count,
      sum(d.set_count)::integer as total_sets,
      (array_agg(d.max_weight_kg order by d.day))[1] as first_weight_kg,
      (array_agg(d.max_weight_kg order by d.day desc))[1] as latest_weight_kg,
      max(d.max_weight_kg) as best_weight_kg,
      round(avg(d.avg_rpe), 1) as avg_rpe,
      (select jsonb_agg(
        jsonb_build_object(
          'data', recent.day,
          'carga_max_kg', recent.max_weight_kg,
          'repeticoes_max', recent.max_reps,
          'volume', round(recent.volume),
          'rpe_medio', recent.avg_rpe
        ) order by recent.day
      )
      from (
        select *
        from set_by_day d2
        where d2.exercise_name = d.exercise_name
        order by d2.day desc
        limit 6
      ) recent) as recent_sessions
    from set_by_day d
    where d.exercise_name in (select exercise_name from top_exercises)
    group by d.exercise_name
  ),
  progression_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'exercicio', p.exercise_name,
          'grupo_muscular', p.muscle_group,
          'sessoes', p.sessions_count,
          'series_total', p.total_sets,
          'carga_inicial_kg', p.first_weight_kg,
          'carga_atual_kg', p.latest_weight_kg,
          'carga_maxima_kg', p.best_weight_kg,
          'rpe_medio', p.avg_rpe,
          'ultimos_treinos', p.recent_sessions
        ) order by p.total_sets desc
      ),
      '[]'::jsonb
    ) as data
    from progression p
  ),
  recent_prs as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'exercicio', r.exercise_name_snapshot,
          'tipo', r.pr_type,
          'metrica', r.metric_label,
          'valor_anterior', r.previous_value,
          'valor_novo', r.new_value,
          'rm_estimado_kg', r.estimated_1rm,
          'data', (r.achieved_date at time zone 'America/Sao_Paulo')::date
        ) order by r.achieved_date desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select *
      from public.personal_records pr
      where pr.student_id = p_student_id
        and (pr.achieved_date at time zone 'America/Sao_Paulo')::date
            between v_start and v_today
      order by pr.achieved_date desc
      limit 10
    ) r
  ),
  physical_assessments as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'data', a.date,
          'peso_kg', a.weight_kg,
          'gordura_pct', a.body_fat_percentage,
          'massa_magra_kg', a.lean_mass_kg,
          'massa_gorda_kg', a.fat_mass_kg,
          'imc', a.bmi,
          'relacao_cintura_quadril', a.waist_hip_ratio
        ) order by a.date desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select *
      from public.assessments x
      where x.student_id = p_student_id
      order by x.date desc
      limit 3
    ) a
  ),
  functional_assessments as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'data', fa.date,
          'metricas_numericas', safe_metrics.metrics
        ) order by fa.date desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select f.date, f.results
      from public.functional_assessments f
      where f.student_id = p_student_id
      order by f.date desc
      limit 5
    ) fa
    cross join lateral (
      select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) as metrics
      from jsonb_each(
        case when jsonb_typeof(fa.results) = 'object'
             then fa.results else '{}'::jsonb end
      ) as item(k, v)
      where lower(k) ~ '^(score|value|result|time_seconds|duration_seconds|repetitions|reps|distance_meters|distance|height_cm|weight_kg|balance_seconds|points|percentage|percent|count|speed|range_of_motion|rom)$'
        and jsonb_typeof(v) in ('number', 'boolean')
    ) safe_metrics
  ),
  active_cycles as (
    select jsonb_build_object(
      'objetivo', left(c.objective, 200),
      'inicio', c.start_date,
      'total_semanas', c.total_weeks,
      'semana_atual', greatest(((v_today - c.start_date) / 7) + 1, 1)
    ) as data
    from public.training_cycles c
    where c.student_id = p_student_id
      and lower(c.status) in ('current', 'active')
    order by c.start_date desc
    limit 1
  ),
  active_routines as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'titulo', left(r.title, 120),
          'objetivo', left(r.objective, 200),
          'versao', r.version
        ) order by r.updated_at desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select *
      from public.routines r
      where r.student_id = p_student_id
        and lower(r.status) = 'active'
      order by r.updated_at desc
      limit 3
    ) r
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object(
      'semanas', v_weeks,
      'inicio', v_start,
      'fim', v_today
    ),
    'aluno', jsonb_build_object(
      'faixa_etaria', v_age_band,
      'modalidade', v_student.modality,
      'status', v_student.status,
      'objetivo', left(v_student.goal, 200),
      'meses_de_acompanhamento',
        case
          when v_student.start_date is null then null
          else greatest(
            0,
            (extract(year from age(v_today, v_student.start_date)) * 12
             + extract(month from age(v_today, v_student.start_date)))::int
          )
        end
    ),
    'ciclo_atual', (select data from active_cycles),
    'rotinas_ativas', (select data from active_routines),
    'frequencia_semanal', (select data from weekly_json),
    'resumo_periodo', (select data from session_totals),
    'progressao_cargas', (select data from progression_json),
    'recordes_recentes', (select data from recent_prs),
    'avaliacoes_fisicas', (select data from physical_assessments),
    'avaliacoes_funcionais', (select data from functional_assessments)
  )
  into v_result;

  return v_result;
end;
$function$


revoke all on function public.get_student_ai_summary(uuid, integer) from public;
revoke all on function public.get_student_ai_summary(uuid, integer) from anon;
grant execute on function public.get_student_ai_summary(uuid, integer) to authenticated;
grant execute on function public.get_student_ai_summary(uuid, integer) to service_role;
