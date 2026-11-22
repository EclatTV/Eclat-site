-- Colle ceci dans Supabase > SQL Editor > Run
create table if not exists profiles (id uuid primary key references auth.users on delete cascade, credits int not null default 0);
create table if not exists usage (user_id uuid references auth.users on delete cascade, day date, n int not null default 0, primary key (user_id, day));
create table if not exists refunds (job text primary key);
create table if not exists payments (ref text primary key);
alter table profiles enable row level security; alter table usage enable row level security;
alter table refunds enable row level security; alter table payments enable row level security;
create policy "own profile" on profiles for select using (auth.uid() = id);

create or replace function consume(p_user uuid, p_cost int, p_free int, p_free_ok boolean) returns text language plpgsql security definer as $$
declare u int; c int;
begin
  insert into profiles(id) values (p_user) on conflict do nothing;
  insert into usage(user_id, day, n) values (p_user, current_date, 0) on conflict do nothing;
  if p_free_ok then
    update usage set n = n + 1 where user_id = p_user and day = current_date and n < p_free returning n into u;
    if found then return 'free'; end if;
  end if;
  update profiles set credits = credits - p_cost where id = p_user and credits >= p_cost returning credits into c;
  if found then return 'credit'; end if;
  return 'denied';
end $$;

create or replace function refund_job(p_job text, p_user uuid, p_kind text, p_cost int) returns void language plpgsql security definer as $$
begin
  insert into refunds(job) values (p_job) on conflict do nothing;
  if not found then return; end if;
  if p_kind = 'free' then update usage set n = greatest(n - 1, 0) where user_id = p_user and day = current_date;
  else update profiles set credits = credits + p_cost where id = p_user; end if;
end $$;

create or replace function add_credits(p_user uuid, p_n int, p_ref text) returns void language plpgsql security definer as $$
begin
  insert into payments(ref) values (p_ref) on conflict do nothing;
  if not found then return; end if;
  insert into profiles(id, credits) values (p_user, p_n) on conflict (id) do update set credits = profiles.credits + p_n;
end $$;

create or replace function get_me(p_user uuid) returns json language sql security definer as $$
  select json_build_object('credits', coalesce((select credits from profiles where id = p_user), 0),
    'free_left', greatest(0, 2 - coalesce((select n from usage where user_id = p_user and day = current_date), 0)));
$$;

revoke all on function consume(uuid,int,int,boolean), refund_job(text,uuid,text,int), add_credits(uuid,int,text), get_me(uuid) from public, anon, authenticated;
grant execute on function consume(uuid,int,int,boolean), refund_job(text,uuid,text,int), add_credits(uuid,int,text), get_me(uuid) to service_role;

-- Stockage des images/vidéos de référence
insert into storage.buckets (id, name, public) values ('refs', 'refs', true) on conflict do nothing;
create policy "upload own refs" on storage.objects for insert to authenticated
  with check (bucket_id = 'refs' and (storage.foldername(name))[1] = auth.uid()::text);
