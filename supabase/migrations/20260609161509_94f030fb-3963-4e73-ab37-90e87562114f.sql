
CREATE POLICY "pm_att read" ON storage.objects FOR SELECT USING (bucket_id = 'pm-attachments');
CREATE POLICY "pm_att insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pm-attachments');
CREATE POLICY "pm_att update" ON storage.objects FOR UPDATE USING (bucket_id = 'pm-attachments');
CREATE POLICY "pm_att delete" ON storage.objects FOR DELETE USING (bucket_id = 'pm-attachments');
