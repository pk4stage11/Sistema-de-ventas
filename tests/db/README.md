# Tests de base de datos (`npm run test:db`)

Estos tests pegan al proyecto Supabase Cloud de desarrollo. Requieren
`.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY`.

Se añaden a partir de la **Fase 1** (esquema, RLS y seed), cuando exista una
base contra la cual probar aislamiento por organización, permisos por rol y
restricciones de concurrencia. Por eso esta carpeta está vacía de tests en la
Fase 0.
