
-- Allow anonymous self-registration (always lands as 'pendente')
CREATE POLICY "Anon self-registration" ON public.afiliados
  FOR INSERT TO anon
  WITH CHECK (
    status = 'pendente'
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'ativo')
  );

-- Authenticated can also self-register (e.g. after Google login)
CREATE POLICY "Auth self-registration" ON public.afiliados
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pendente'
    AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status = 'ativo')
  );

-- Storage policies: afiliado-fotos & afiliado-documentos (path: <tenant_id>/<afiliado_id>/...)
-- Anyone authenticated as the matching afiliado can read their own files
CREATE POLICY "Tenant staff reads afiliado files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('afiliado-fotos','afiliado-documentos','tenant-assets')
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "Tenant staff writes afiliado files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('afiliado-fotos','afiliado-documentos','tenant-assets')
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "Tenant staff updates afiliado files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('afiliado-fotos','afiliado-documentos','tenant-assets')
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

-- Allow anonymous uploads to afiliado-documentos under a tenant of an active sindicato
-- (used by public self-registration to attach RG / comprovante)
CREATE POLICY "Anon uploads pending docs" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id IN ('afiliado-fotos','afiliado-documentos')
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = (storage.foldername(name))[1]::uuid AND t.status = 'ativo'
    )
  );
