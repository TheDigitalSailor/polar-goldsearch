-- Allow deletes on radar tables (maintenance / cleanup), matching the analyses table.
do $$ begin
  create policy "radar_listings delete" on radar_listings for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "radar_runs delete" on radar_runs for delete using (true);
exception when duplicate_object then null; end $$;
