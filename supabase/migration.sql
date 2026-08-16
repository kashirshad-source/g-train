-- Personal Trainer App — initial schema + RLS
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  default_role text check (default_role in ('trainer', 'client')),
  bio text,
  specialties text[],
  goals text,
  -- Digits-only, no country code (e.g. "5551234567") — the join key for
  -- matching a trainer's text invite to the client who signs up with it.
  phone text,
  -- Platform admin. Can never be set by the account holder themselves —
  -- see protect_is_admin_trigger below — only by an existing admin.
  is_admin boolean not null default false,
  -- Login handle for accounts created directly by an admin (trainers), as
  -- an alternative to a real email — e.g. "smith", deduped to "smith2" if
  -- taken. Null for accounts that sign in with a real email.
  username text unique,
  -- Set true right after an admin creates a trainer account with the
  -- shared starting password; forces a password change before anything
  -- else is usable. See the middleware gate and /change-password.
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

-- Existing databases: this table predates username/must_change_password.
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  timezone text not null default 'UTC',
  -- Who originally created the location. Purely informational — it grants no
  -- special permissions; every trainer at a location manages it equally.
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- Base locations (e.g. a shared studio every trainer/client belongs to by
  -- default) can't be deleted and are auto-joined by every new signup.
  is_base boolean not null default false,
  invite_code text not null unique
    default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table if not exists public.location_members (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('trainer', 'client')),
  status text not null default 'active' check (status in ('active', 'pending')),
  joined_at timestamptz not null default now(),
  unique (location_id, user_id, role)
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- recurring_blocks: a standing weekly commitment (e.g. a class the trainer
-- runs at the location that's booked through the location's own system, not
-- this app) that blocks personal-training bookings during that time. Visible
-- only to the trainer who owns it — clients never see the label, only that
-- the time isn't offered.
create table if not exists public.recurring_blocks (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (ends_on is null or ends_on >= starts_on)
);

-- admin_trainer_invites: an activation code an admin generates and texts to
-- someone so they can become a trainer. Trainer signup is gated on entering
-- a valid, unredeemed code — see redeem_trainer_activation_code below.
create table if not exists public.admin_trainer_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  name text,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Existing databases: this table predates the `name` column.
alter table public.admin_trainer_invites add column if not exists name text;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- client_rosters: who's actually on a trainer's roster at a location —
-- populated by accepting a text invite, or by making a first booking.
-- This (not location_members) is the source of truth for "my clients".
create table if not exists public.client_rosters (
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trainer_id, client_id, location_id)
);

-- location_invites: a trainer records someone's phone number and texts them
-- themselves — as a client to train, or as a fellow trainer to join the
-- location. When that phone number later signs up with a matching role,
-- they're auto-matched. This is the only way to join a non-base location.
create table if not exists public.location_invites (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  phone text not null,
  role text not null default 'client' check (role in ('trainer', 'client')),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- notifications: lightweight in-app alerts. Written only via the
-- notify_* security-definer functions below, never inserted directly by a
-- client, so a user can't fabricate one as if from someone else or spam
-- another user's feed.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'booking_cancelled' check (type in (
    'booking_cancelled', 'slot_offer_available', 'slot_offer_requested',
    'slot_offer_confirmed', 'slot_offer_unavailable'
  )),
  booking_id uuid references public.bookings (id) on delete cascade,
  slot_offer_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Existing databases: these predate the slot-offer notification types.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'booking_cancelled', 'slot_offer_available', 'slot_offer_requested',
  'slot_offer_confirmed', 'slot_offer_unavailable'
));
alter table public.notifications add column if not exists slot_offer_id uuid;

-- slot_offers: a trainer re-opening a just-cancelled time to every client
-- at that location. filled_booking_id is set once a request is confirmed.
create table if not exists public.slot_offers (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'open' check (status in ('open', 'filled', 'closed')),
  filled_booking_id uuid references public.bookings (id) on delete set null,
  -- The booking that freed this time, if any — lets us avoid re-offering
  -- the same cancellation twice from the notification action button.
  source_booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Existing databases: this table predates source_booking_id.
alter table public.slot_offers add column if not exists source_booking_id uuid references public.bookings (id) on delete set null;

-- slot_offer_requests: a client raising their hand for an open slot offer.
-- The trainer picks one to confirm; the rest just stay on record.
create table if not exists public.slot_offer_requests (
  id uuid primary key default gen_random_uuid(),
  slot_offer_id uuid not null references public.slot_offers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (slot_offer_id, client_id)
);

alter table public.notifications drop constraint if exists notifications_slot_offer_id_fkey;
alter table public.notifications
  add constraint notifications_slot_offer_id_fkey
  foreign key (slot_offer_id) references public.slot_offers (id) on delete cascade;

create index if not exists idx_location_members_user on public.location_members (user_id);
create index if not exists idx_location_members_location on public.location_members (location_id);
create index if not exists idx_availability_trainer_location on public.availability (trainer_id, location_id, date);
create index if not exists idx_recurring_blocks_trainer_location on public.recurring_blocks (trainer_id, location_id, day_of_week);
create index if not exists idx_bookings_trainer on public.bookings (trainer_id);
create index if not exists idx_bookings_client on public.bookings (client_id);
create index if not exists idx_bookings_location on public.bookings (location_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at);
create index if not exists idx_conversation_participants_user on public.conversation_participants (user_id);
create index if not exists idx_notifications_user on public.notifications (user_id, created_at);
create index if not exists idx_slot_offers_location on public.slot_offers (location_id, status);
create index if not exists idx_slot_offer_requests_offer on public.slot_offer_requests (slot_offer_id);

-- ============================================================
-- New-user bootstrap: create a profile row right after Google sign-in
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Base-location bootstrap: once someone finishes onboarding (default_role
-- goes from null to set), auto-join them to every base location as that role
-- ============================================================

create or replace function public.join_base_locations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.location_members (location_id, user_id, role, status)
  select l.id, new.id, new.default_role, 'active'
  from public.locations l
  where l.is_base = true
  on conflict (location_id, user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_role_set on public.profiles;
create trigger on_profile_role_set
  after update of default_role on public.profiles
  for each row
  when (new.default_role is not null and old.default_role is distinct from new.default_role)
  execute function public.join_base_locations();

-- ============================================================
-- RLS helper functions (SECURITY DEFINER so they can read
-- location_members / conversation_participants without the
-- calling policy recursing into itself)
-- ============================================================

create or replace function public.is_location_member(p_location_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.location_members
    where location_id = p_location_id and user_id = p_user_id and status = 'active'
  );
$$;

-- Trainers at a location are peers — none of them "owns" it, so this checks
-- active trainer membership rather than the (purely informational) owner_id.
create or replace function public.is_location_trainer(p_location_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.location_members
    where location_id = p_location_id and user_id = p_user_id
      and role = 'trainer' and status = 'active'
  );
$$;

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = p_user_id
  );
$$;

grant execute on function public.is_location_member(uuid, uuid) to authenticated;
grant execute on function public.is_location_trainer(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

-- Lets someone who isn't a member yet resolve an invite code to a location
-- (name only) so they can join it, without exposing the full locations table.
create or replace function public.location_by_invite_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select id, name from public.locations where invite_code = p_code;
$$;

grant execute on function public.location_by_invite_code(text) to authenticated;

-- Lets a client resolve which times are blocked by one of the trainer's
-- recurring commitments on a given date — without exposing the label or any
-- other column from recurring_blocks, which stays private to the trainer.
create or replace function public.recurring_blocks_for_date(
  p_trainer_id uuid,
  p_location_id uuid,
  p_date date
)
returns table (start_time time, end_time time)
language sql
security definer
set search_path = public
stable
as $$
  select rb.start_time, rb.end_time
  from public.recurring_blocks rb
  where rb.trainer_id = p_trainer_id
    and rb.location_id = p_location_id
    and rb.day_of_week = extract(dow from p_date)
    and p_date >= rb.starts_on
    and (rb.ends_on is null or p_date <= rb.ends_on);
$$;

grant execute on function public.recurring_blocks_for_date(uuid, uuid, date) to authenticated;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = p_user_id), false);
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- Blocks an account holder from granting themselves admin via a direct API
-- update — only someone who is *already* an admin can change this column.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if not public.is_admin(auth.uid()) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin_trigger on public.profiles;
create trigger protect_is_admin_trigger
before update on public.profiles
for each row execute function public.protect_is_admin();

-- Blocks an account holder from clearing their own must_change_password
-- flag (or changing their username) via a direct API update — the app's
-- own changePassword action clears the flag, but only via the service-role
-- client, and only after auth.updateUser() has actually rotated the
-- password. Without this, a trainer still on the shared starting password
-- could dismiss the forced-change screen without ever changing it.
create or replace function public.protect_profile_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is distinct from old.username
    or new.must_change_password is distinct from old.must_change_password
  then
    if auth.role() <> 'service_role' and not public.is_admin(auth.uid()) then
      new.username := old.username;
      new.must_change_password := old.must_change_password;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_flags_trigger on public.profiles;
create trigger protect_profile_flags_trigger
before update on public.profiles
for each row execute function public.protect_profile_flags();

-- Redeems a trainer activation code during onboarding. Callable by anyone
-- (the person isn't a trainer yet, so can't be gated behind is_location_*
-- style checks) — safe because it only flips one pending row to accepted
-- and returns a bare boolean, nothing about the invite is exposed.
create or replace function public.redeem_trainer_activation_code(p_code text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.admin_trainer_invites
  where code = p_code and status = 'pending'
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.admin_trainer_invites
  set status = 'accepted', accepted_by = p_user_id, accepted_at = now()
  where id = v_id;

  return true;
end;
$$;

grant execute on function public.redeem_trainer_activation_code(text, uuid) to authenticated;

-- Notifies the other party on a booking that it was cancelled. Callable by
-- either the trainer or client on that booking; resolves the recipient as
-- "whichever of the two isn't the caller" and writes the notification as
-- that recipient, which a plain insert policy couldn't do without letting
-- a user write into anyone else's notification feed.
create or replace function public.notify_booking_cancelled(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_client_id uuid;
  v_actor uuid := auth.uid();
  v_recipient uuid;
begin
  select trainer_id, client_id into v_trainer_id, v_client_id
  from public.bookings
  where id = p_booking_id;

  if v_trainer_id is null then
    return;
  end if;

  if v_actor is distinct from v_trainer_id and v_actor is distinct from v_client_id then
    return;
  end if;

  v_recipient := case when v_actor = v_trainer_id then v_client_id else v_trainer_id end;

  insert into public.notifications (user_id, actor_id, type, booking_id)
  values (v_recipient, v_actor, 'booking_cancelled', p_booking_id);
end;
$$;

grant execute on function public.notify_booking_cancelled(uuid) to authenticated;

-- Notifies every client at a slot offer's location that it's open. Only
-- the trainer who created the offer can trigger this — needed because a
-- plain insert policy can't let one user write into many others' feeds.
create or replace function public.notify_slot_offer_available(p_slot_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_location_id uuid;
begin
  select trainer_id, location_id into v_trainer_id, v_location_id
  from public.slot_offers
  where id = p_slot_offer_id;

  if v_trainer_id is null or v_trainer_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (user_id, actor_id, type, slot_offer_id)
  select lm.user_id, v_trainer_id, 'slot_offer_available', p_slot_offer_id
  from public.location_members lm
  where lm.location_id = v_location_id and lm.role = 'client' and lm.status = 'active';
end;
$$;

grant execute on function public.notify_slot_offer_available(uuid) to authenticated;

-- Notifies the trainer that a client requested their open slot offer.
-- Requires an actual request row to already exist (inserted by the client
-- under slot_offer_requests_insert's RLS check, just before this call).
create or replace function public.notify_slot_offer_requested(p_slot_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_client_id uuid := auth.uid();
  v_status text;
begin
  select trainer_id, status into v_trainer_id, v_status
  from public.slot_offers
  where id = p_slot_offer_id;

  if v_trainer_id is null or v_status <> 'open' then
    raise exception 'offer not available';
  end if;

  if not exists (
    select 1 from public.slot_offer_requests
    where slot_offer_id = p_slot_offer_id and client_id = v_client_id
  ) then
    raise exception 'no request on file';
  end if;

  insert into public.notifications (user_id, actor_id, type, slot_offer_id)
  values (v_trainer_id, v_client_id, 'slot_offer_requested', p_slot_offer_id);
end;
$$;

grant execute on function public.notify_slot_offer_requested(uuid) to authenticated;

-- Notifies the winning requester their slot is confirmed, and every other
-- requester that it's no longer available. Called by the trainer right
-- after they've booked the winner and marked the offer filled themselves
-- (both plain RLS-governed writes) — this just handles the fan-out
-- notifications, which cross into other users' feeds.
create or replace function public.notify_slot_offer_result(p_slot_offer_id uuid, p_winning_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_booking_id uuid;
begin
  select trainer_id, filled_booking_id into v_trainer_id, v_booking_id
  from public.slot_offers
  where id = p_slot_offer_id;

  if v_trainer_id is null or v_trainer_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (user_id, actor_id, type, booking_id)
  values (p_winning_client_id, v_trainer_id, 'slot_offer_confirmed', v_booking_id);

  insert into public.notifications (user_id, actor_id, type, slot_offer_id)
  select client_id, v_trainer_id, 'slot_offer_unavailable', p_slot_offer_id
  from public.slot_offer_requests
  where slot_offer_id = p_slot_offer_id and client_id <> p_winning_client_id;
end;
$$;

grant execute on function public.notify_slot_offer_result(uuid, uuid) to authenticated;

-- When a phone number and role are set (at signup or later in Settings),
-- match against any pending invite for that number+role and roster them up
-- — as a client (also recorded on the inviting trainer's roster) or as a
-- fellow trainer at the location.
create or replace function public.match_location_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.phone is not null and new.default_role is not null then
    insert into public.location_members (location_id, user_id, role, status)
    select li.location_id, new.id, li.role, 'active'
    from public.location_invites li
    where li.phone = new.phone and li.role = new.default_role and li.status = 'pending'
    on conflict (location_id, user_id, role) do nothing;

    insert into public.client_rosters (trainer_id, client_id, location_id)
    select li.trainer_id, new.id, li.location_id
    from public.location_invites li
    where li.phone = new.phone and li.role = 'client' and new.default_role = 'client'
      and li.status = 'pending'
    on conflict (trainer_id, client_id, location_id) do nothing;

    update public.location_invites
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where phone = new.phone and role = new.default_role and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_phone_set on public.profiles;
create trigger on_profile_phone_set
  after insert or update of phone, default_role on public.profiles
  for each row
  execute function public.match_location_invites();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.location_members enable row level security;
alter table public.availability enable row level security;
alter table public.recurring_blocks enable row level security;
alter table public.admin_trainer_invites enable row level security;
alter table public.bookings enable row level security;
alter table public.client_rosters enable row level security;
alter table public.location_invites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.slot_offers enable row level security;
alter table public.slot_offer_requests enable row level security;

-- profiles: see your own profile, or anyone who shares a location with you
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.location_members lm1
      join public.location_members lm2 on lm1.location_id = lm2.location_id
      where lm1.user_id = auth.uid() and lm1.status = 'active'
        and lm2.user_id = profiles.id and lm2.status = 'active'
    )
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- locations: any active member can see it; any trainer there can edit it;
-- any trainer there can delete it, except base locations (never deletable)
-- owner_id is kept in the select check purely so a freshly-created location
-- is visible to its creator before the location_members row exists yet
-- (the insert-then-select-back in createLocation would otherwise return
-- nothing and silently abort before the membership row gets inserted).
-- It grants no other special powers — update/delete stay membership-gated.
create policy "locations_select" on public.locations
  for select using (owner_id = auth.uid() or public.is_location_member(id, auth.uid()));

create policy "locations_insert" on public.locations
  for insert with check (owner_id = auth.uid());

create policy "locations_update" on public.locations
  for update using (public.is_location_trainer(id, auth.uid()))
  with check (public.is_location_trainer(id, auth.uid()));

create policy "locations_delete" on public.locations
  for delete using (public.is_location_trainer(id, auth.uid()) and not is_base);

-- location_members: members can see the roster; users can add/remove
-- themselves (join/leave); any trainer at the location can manage anyone
create policy "location_members_select" on public.location_members
  for select using (
    user_id = auth.uid() or public.is_location_member(location_id, auth.uid())
  );

create policy "location_members_insert" on public.location_members
  for insert with check (
    user_id = auth.uid() or public.is_location_trainer(location_id, auth.uid())
  );

create policy "location_members_update" on public.location_members
  for update using (public.is_location_trainer(location_id, auth.uid()))
  with check (public.is_location_trainer(location_id, auth.uid()));

create policy "location_members_delete" on public.location_members
  for delete using (
    user_id = auth.uid() or public.is_location_trainer(location_id, auth.uid())
  );

-- availability: visible to anyone at the location; only the owning trainer edits it
create policy "availability_select" on public.availability
  for select using (public.is_location_member(location_id, auth.uid()));

create policy "availability_insert" on public.availability
  for insert with check (
    trainer_id = auth.uid() and public.is_location_member(location_id, auth.uid())
  );

create policy "availability_update" on public.availability
  for update using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "availability_delete" on public.availability
  for delete using (trainer_id = auth.uid());

-- recurring_blocks: fully private to the owning trainer. Clients resolve
-- whether a time is blocked via the security-definer function below, which
-- returns only start/end times — never the label or row itself.
create policy "recurring_blocks_all" on public.recurring_blocks
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- admin_trainer_invites: fully private to admins. Redemption during
-- onboarding goes through the security-definer function above, not a policy.
create policy "admin_trainer_invites_all" on public.admin_trainer_invites
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- bookings: the trainer, the client, and any other trainer at that location
-- (for scheduling coordination) can see a booking; a client creates their own
create policy "bookings_select" on public.bookings
  for select using (
    trainer_id = auth.uid()
    or client_id = auth.uid()
    or public.is_location_trainer(location_id, auth.uid())
  );

create policy "bookings_insert" on public.bookings
  for insert with check (
    (client_id = auth.uid() and public.is_location_member(location_id, auth.uid()))
    or (trainer_id = auth.uid() and public.is_location_trainer(location_id, auth.uid()))
  );

create policy "bookings_update" on public.bookings
  for update using (trainer_id = auth.uid() or client_id = auth.uid())
  with check (trainer_id = auth.uid() or client_id = auth.uid());

-- client_rosters: the trainer and the client on that row can see it; rows
-- are only ever written by the client (accepting an invite, or booking)
create policy "client_rosters_select" on public.client_rosters
  for select using (trainer_id = auth.uid() or client_id = auth.uid());

create policy "client_rosters_insert" on public.client_rosters
  for insert with check (client_id = auth.uid());

-- notifications: only ever readable/updatable (marking read) by their
-- recipient; writes only happen through the notify_* functions above
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- slot_offers: the trainer who posted it, or any active member of that
-- location (so clients can see it to request it), can see it. Only the
-- trainer can create or update one — no client-side path to fabricate an
-- offer or mark someone else's offer filled.
create policy "slot_offers_select" on public.slot_offers
  for select using (
    trainer_id = auth.uid() or public.is_location_member(location_id, auth.uid())
  );

create policy "slot_offers_insert" on public.slot_offers
  for insert with check (
    trainer_id = auth.uid() and public.is_location_trainer(location_id, auth.uid())
  );

create policy "slot_offers_update" on public.slot_offers
  for update using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- slot_offer_requests: a client can request an open offer at a location
-- they belong to (never on behalf of anyone else); the client who made it
-- and the trainer who owns the offer can both see it.
create policy "slot_offer_requests_select" on public.slot_offer_requests
  for select using (
    client_id = auth.uid()
    or exists (
      select 1 from public.slot_offers so
      where so.id = slot_offer_id and so.trainer_id = auth.uid()
    )
  );

create policy "slot_offer_requests_insert" on public.slot_offer_requests
  for insert with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.slot_offers so
      join public.location_members lm
        on lm.location_id = so.location_id and lm.user_id = auth.uid()
      where so.id = slot_offer_id and so.status = 'open'
        and lm.role = 'client' and lm.status = 'active'
    )
  );

-- location_invites: only the trainer who sent it can list their invites;
-- matching and acceptance go through the security-definer trigger function
create policy "location_invites_select" on public.location_invites
  for select using (trainer_id = auth.uid());

create policy "location_invites_insert" on public.location_invites
  for insert with check (
    trainer_id = auth.uid() and public.is_location_trainer(location_id, auth.uid())
  );

-- conversations: only participants can see a conversation; any signed-in
-- user can create the shell row (participants are added right after)
create policy "conversations_select" on public.conversations
  for select using (public.is_conversation_participant(id, auth.uid()));

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() is not null);

-- conversation_participants: participants can see the roster; a user can
-- add themselves, or add another member of the same location
create policy "conversation_participants_select" on public.conversation_participants
  for select using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "conversation_participants_insert" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.location_id is not null
        and public.is_location_member(c.location_id, auth.uid())
        and public.is_location_member(c.location_id, user_id)
    )
  );

-- messages: only participants can read/send; a participant can update a
-- message (used to stamp read_at) but not impersonate another sender
create policy "messages_select" on public.messages
  for select using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid() and public.is_conversation_participant(conversation_id, auth.uid())
  );

create policy "messages_update" on public.messages
  for update using (public.is_conversation_participant(conversation_id, auth.uid()))
  with check (public.is_conversation_participant(conversation_id, auth.uid()));

-- ============================================================
-- Realtime: broadcast new/changed messages to subscribed clients
-- ============================================================

alter publication supabase_realtime add table public.messages;
