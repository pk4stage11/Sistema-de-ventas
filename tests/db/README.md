# Tests de base de datos (`npm run test:db`)

Estos tests pegan al proyecto Supabase Cloud de desarrollo (no un mock).
Requieren `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, y que las
migraciones de `supabase/migrations/` ya estén aplicadas
(`npm run db:push`).

- `rls.test.ts` (Fase 1): aislamiento por organización y permisos por rol
  — un asesor no ve datos de otra organización y no puede aprobar una
  reserva; un admin sí puede. Crea y limpia su propia fixture (dos
  organizaciones de prueba), sin tocar los datos del seed
  (`scripts/seed.ts`).
- El test de concurrencia sobre reservas (dos aprobaciones simultáneas de
  la misma unidad, solo una gana) se añade en la **Fase 6**, cuando exista
  el flujo completo de cierre de reserva.
