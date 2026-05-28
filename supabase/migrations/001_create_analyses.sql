-- Analyses table for GoldSearch
create table if not exists analyses (
  id          uuid primary key default gen_random_uuid(),
  address     text not null,
  typology    text not null,
  area        numeric not null,
  asking_price numeric not null,
  verdict     text not null,
  net_margin  numeric not null,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

-- Index for history queries
create index if not exists analyses_created_at_idx on analyses (created_at desc);

-- Enable Row Level Security (read-only public for MVP — no auth)
alter table analyses enable row level security;

create policy "Allow public read" on analyses
  for select using (true);

create policy "Allow public insert" on analyses
  for insert with check (true);
