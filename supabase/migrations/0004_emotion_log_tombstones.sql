-- Day 13: Clear History tombstones (Option B).
-- When a signed-in user clears their history, the ids of the cleared check-ins
-- are recorded so a delayed upload, or another signed-in phone, can never put
-- them back. The table holds ONLY the owner's account id and the random
-- check-in id: no time, feeling, strength or text. It lives in a schema the
-- Data API does not expose, has RLS on with no policies, and is reachable only
-- through the two security-definer functions below. Its rows are deleted with
-- the account (cascade). Additive only: no existing table, policy or row of
-- public.emotion_logs is changed by this migration.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.emotion_log_tombstones (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_id  uuid not null,
  primary key (user_id, log_id)
);

alter table private.emotion_log_tombstones enable row level security;
revoke all on table private.emotion_log_tombstones from public, anon, authenticated;

-- Insert guard: silently skip any insert of a cleared (account, check-in id).
-- The per-account advisory lock is shared with clear_history, so an upload that
-- races a clear either commits before it (and is then cleared by it) or waits
-- for it and then sees the tombstones.
create or replace function private.skip_cleared_emotion_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('emotion_logs:' || new.user_id::text, 0));
  if exists (
    select 1
    from private.emotion_log_tombstones t
    where t.user_id = new.user_id and t.log_id = new.id
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function private.skip_cleared_emotion_log() from public, anon, authenticated;

create or replace trigger emotion_logs_skip_cleared
  before insert on public.emotion_logs
  for each row execute function private.skip_cleared_emotion_log();

-- Signed-in Clear History, in one transaction: tombstone every check-in in the
-- caller's account plus the ids the phone holds, delete the account's rows, and
-- return the cleared ids. Scoped to auth.uid(); anon cannot call it.
create or replace function public.clear_history(local_ids uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cleared uuid[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if coalesce(cardinality(local_ids), 0) > 50000 then
    raise exception 'too many ids' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('emotion_logs:' || uid::text, 0));

  select coalesce(array_agg(distinct s.x), '{}')
  into cleared
  from (
    select l.id as x from public.emotion_logs l where l.user_id = uid
    union
    select unnest(coalesce(local_ids, '{}'::uuid[]))
  ) s
  where s.x is not null;

  insert into private.emotion_log_tombstones (user_id, log_id)
  select uid, unnest(cleared)
  on conflict do nothing;

  delete from public.emotion_logs where user_id = uid;

  return cleared;
end;
$$;

revoke all on function public.clear_history(uuid[]) from public, anon;
grant execute on function public.clear_history(uuid[]) to authenticated;
