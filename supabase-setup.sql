-- Run this once in Supabase > SQL Editor.
create table if not exists public.match_overrides (
  match_id text primary key,
  score_a integer,
  score_b integer,
  yellow_a integer not null default 0 check (yellow_a >= 0),
  red_a integer not null default 0 check (red_a >= 0),
  yellow_b integer not null default 0 check (yellow_b >= 0),
  red_b integer not null default 0 check (red_b >= 0),
  quick_goal_team text,
  quick_goal_minute integer check (quick_goal_minute between 0 and 130),
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.sweepstake_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

alter table public.match_overrides enable row level security;
alter table public.sweepstake_settings enable row level security;

grant select on public.match_overrides to anon, authenticated;
grant select on public.sweepstake_settings to anon, authenticated;
grant insert, update, delete on public.match_overrides to authenticated;
grant insert, update, delete on public.sweepstake_settings to authenticated;

drop policy if exists "Public can read match overrides" on public.match_overrides;
create policy "Public can read match overrides"
on public.match_overrides for select to anon, authenticated using (true);

drop policy if exists "Organiser can insert match overrides" on public.match_overrides;
create policy "Organiser can insert match overrides"
on public.match_overrides for insert to authenticated
with check (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com');

drop policy if exists "Organiser can update match overrides" on public.match_overrides;
create policy "Organiser can update match overrides"
on public.match_overrides for update to authenticated
using (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com');

drop policy if exists "Organiser can delete match overrides" on public.match_overrides;
create policy "Organiser can delete match overrides"
on public.match_overrides for delete to authenticated
using (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com');

drop policy if exists "Public can read sweepstake settings" on public.sweepstake_settings;
create policy "Public can read sweepstake settings"
on public.sweepstake_settings for select to anon, authenticated using (true);

drop policy if exists "Organiser can insert sweepstake settings" on public.sweepstake_settings;
create policy "Organiser can insert sweepstake settings"
on public.sweepstake_settings for insert to authenticated
with check (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com');

drop policy if exists "Organiser can update sweepstake settings" on public.sweepstake_settings;
create policy "Organiser can update sweepstake settings"
on public.sweepstake_settings for update to authenticated
using (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'hashim.hussain.uk@gmail.com');

insert into public.sweepstake_settings (key, value)
values ('champion', ''), ('runner_up', '')
on conflict (key) do nothing;
