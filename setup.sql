-- Supabase SQL Editor에서 직접 실행하세요. 교육용 가상 일정만 저장합니다.
begin;

create table if not exists public.wx_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  region text not null check (region in ('세종', '대전', '태안', '보령')),
  kind text not null check (kind in ('야외', '고소', '실내')),
  owner text not null check (length(btrim(owner)) > 0),
  created_at timestamptz not null default clock_timestamp()
);

alter table public.wx_tasks enable row level security;

-- 로그인 없는 프로토타입: 공개 방문자는 조회와 추가만 가능합니다.
revoke all on table public.wx_tasks from public, anon, authenticated;
grant usage on schema public to anon;
grant select on table public.wx_tasks to anon;
grant insert (title, region, kind, owner) on public.wx_tasks to anon;

drop policy if exists wx_tasks_read on public.wx_tasks;
create policy wx_tasks_read on public.wx_tasks
  for select to anon using (true);

drop policy if exists wx_tasks_add on public.wx_tasks;
create policy wx_tasks_add on public.wx_tasks
  for insert to anon with check (true);

-- 표가 비어 있을 때만 기본 6건 등록. 재실행해도 기존 일정을 지우지 않습니다.
do $$
begin
  if not exists (select 1 from public.wx_tasks) then
    insert into public.wx_tasks (title, region, kind, owner, created_at)
    select title, region, kind, owner,
      current_timestamp - interval '1 second' + position * interval '1 microsecond'
    from (values
      (1, '다중이용시설 안전점검', '세종', '야외', '김안전'),
      (2, '시민 안전체험 행사 운영', '보령', '야외', '이행사'),
      (3, '옥상 태양광 설비 점검', '태안', '고소', '박설비'),
      (4, '하천 수위계 확인', '대전', '야외', '최현장'),
      (5, '청사 외벽 간판 보수', '세종', '고소', '정시설'),
      (6, '비상연락 훈련', '대전', '실내', '한상황')
    ) as seed(position, title, region, kind, owner)
    order by position;
  end if;
end;
$$;

commit;
