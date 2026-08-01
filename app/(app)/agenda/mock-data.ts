/**
 * Datos de muestra para previsualizar la Agenda (Fase 4.5 real: visits +
 * Google Calendar vía freebusy). No hay mockup de referencia para esta
 * pantalla — es nueva de esta plataforma, no existía en el sitio público
 * de InteresArte — así que se diseñó siguiendo el mismo sistema visual.
 */

export type SyncStatus = 'sincronizado' | 'pendiente_sincronizacion' | 'error';
export type Asistencia = 'pendiente' | 'asistio' | 'no_asistio' | 'reprogramada';

export interface VisitaAgenda {
  id: string;
  fecha: string;
  hora: string;
  cliente: string;
  iniciales: string;
  proyecto: string;
  unidad: string;
  asesor: string;
  syncStatus: SyncStatus;
  asistencia: Asistencia;
}

export const VISITAS_MOCK: VisitaAgenda[] = [
  {
    id: '1',
    fecha: 'Hoy · lunes 3 de agosto',
    hora: '10:00 a. m.',
    cliente: 'María Rodríguez',
    iniciales: 'MR',
    proyecto: 'Edificio Vista Mar',
    unidad: '301 · Flat 2 dormitorios',
    asesor: 'Cristhian A.',
    syncStatus: 'sincronizado',
    asistencia: 'pendiente',
  },
  {
    id: '2',
    fecha: 'Hoy · lunes 3 de agosto',
    hora: '4:30 p. m.',
    cliente: 'Jorge Paredes',
    iniciales: 'JP',
    proyecto: 'Edificio Vista Mar',
    unidad: '502 · Dúplex 3 dormitorios',
    asesor: 'Cristhian A.',
    syncStatus: 'error',
    asistencia: 'pendiente',
  },
  {
    id: '3',
    fecha: 'Mañana · martes 4 de agosto',
    hora: '11:00 a. m.',
    cliente: 'Renzo Aguilar',
    iniciales: 'RA',
    proyecto: 'Edificio Vista Mar',
    unidad: '402 · Flat 3 dormitorios',
    asesor: 'Fiorella Ríos',
    syncStatus: 'sincronizado',
    asistencia: 'pendiente',
  },
  {
    id: '4',
    fecha: 'Mañana · martes 4 de agosto',
    hora: '5:00 p. m.',
    cliente: 'Lucía Campos',
    iniciales: 'LC',
    proyecto: 'Edificio Vista Mar',
    unidad: '301 · Flat 1 dormitorio',
    asesor: 'Cristhian A.',
    syncStatus: 'pendiente_sincronizacion',
    asistencia: 'pendiente',
  },
  {
    id: '5',
    fecha: 'Ayer · domingo 2 de agosto',
    hora: '3:00 p. m.',
    cliente: 'Fiorella Núñez',
    iniciales: 'FN',
    proyecto: 'Edificio Vista Mar',
    unidad: '601 · Flat 2 dormitorios',
    asesor: 'Fiorella Ríos',
    syncStatus: 'sincronizado',
    asistencia: 'asistio',
  },
  {
    id: '6',
    fecha: 'Ayer · domingo 2 de agosto',
    hora: '10:30 a. m.',
    cliente: 'Diego Salazar',
    iniciales: 'DS',
    proyecto: 'Edificio Vista Mar',
    unidad: '701 · Dúplex 3 dormitorios',
    asesor: 'Cristhian A.',
    syncStatus: 'sincronizado',
    asistencia: 'no_asistio',
  },
];
