create policy "evidencias_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_member(auth.uid()));
create policy "evidencias_select_own_or_staff" on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));