-- Run this once in Supabase SQL Editor.
insert into storage.buckets (id, name, public)
values ('lesson-reports', 'lesson-reports', false)
on conflict (id) do update set public = false;

create policy "authenticated read lesson reports"
on storage.objects for select to authenticated
using (bucket_id = 'lesson-reports');

create policy "authenticated upload lesson reports"
on storage.objects for insert to authenticated
with check (bucket_id = 'lesson-reports');

create policy "authenticated update lesson reports"
on storage.objects for update to authenticated
using (bucket_id = 'lesson-reports')
with check (bucket_id = 'lesson-reports');

create policy "authenticated delete lesson reports"
on storage.objects for delete to authenticated
using (bucket_id = 'lesson-reports');
