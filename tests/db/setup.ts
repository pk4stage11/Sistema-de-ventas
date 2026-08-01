// Carga .env.local antes de que corran los tests de este proyecto de
// Vitest. Los tests unitarios (project "unit") no lo necesitan.
// `dotenv/config` por defecto solo carga `.env`; este proyecto usa
// `.env.local` (convención de Next.js), así que hay que indicarlo.
import { config } from 'dotenv';
config({ path: '.env.local' });
