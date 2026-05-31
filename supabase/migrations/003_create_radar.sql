-- Radar: automated property scanner for GoldSearch (Vila Franca de Xira)

-- Every listing the scraper has ever found
create table if not exists radar_listings (
  id            uuid primary key default gen_random_uuid(),
  listing_id    text not null unique,           -- stable Imovirtual ad id
  title         text,
  location      text,
  price         numeric,
  area_m2       numeric,
  price_per_m2  numeric,
  typology      text,
  days_on_market integer,
  url           text,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  status        text not null default 'new' check (status in ('new','seen','saved','discarded')),
  tier          text check (tier in ('strong','investigate')),
  price_history jsonb not null default '[]'::jsonb
);

create index if not exists radar_listings_status_idx on radar_listings (status);
create index if not exists radar_listings_tier_idx   on radar_listings (tier);
create index if not exists radar_listings_seen_idx    on radar_listings (last_seen desc);

-- One row per scraper run
create table if not exists radar_runs (
  id             uuid primary key default gen_random_uuid(),
  run_at         timestamptz not null default now(),
  listings_found integer not null default 0,
  new_listings   integer not null default 0,
  price_drops    integer not null default 0,
  zone           text
);

create index if not exists radar_runs_run_at_idx on radar_runs (run_at desc);

-- RLS — public access for the MVP (matches the analyses table, no auth yet)
alter table radar_listings enable row level security;
alter table radar_runs     enable row level security;

do $$ begin
  create policy "radar_listings read"   on radar_listings for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "radar_listings insert" on radar_listings for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "radar_listings update" on radar_listings for update using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "radar_runs read"   on radar_runs for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "radar_runs insert" on radar_runs for insert with check (true);
exception when duplicate_object then null; end $$;
