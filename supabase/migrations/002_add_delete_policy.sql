do $$ begin
  create policy "Allow public delete" on analyses for delete using (true);
exception when duplicate_object then null; end $$;
