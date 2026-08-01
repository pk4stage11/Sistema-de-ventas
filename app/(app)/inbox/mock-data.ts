/**
 * Datos de muestra para previsualizar la Bandeja (Fase 3 real: Supabase
 * Realtime sobre `leads`/`contacts`/`messages`, Fase 2 en adelante). Los
 * nombres de proyecto/unidad coinciden con el seed de Fase 1
 * (scripts/seed.ts — "Edificio Vista Mar", Miraflores) para que la vista
 * previa sea consistente con el resto del sistema.
 */

export type CanalConsulta = 'whatsapp' | 'landing';
export type EstadoConsulta = 'nuevo' | 'contactada' | 'cerrada';

export interface ConsultaResumen {
  id: string;
  nombre: string;
  iniciales: string;
  canal: CanalConsulta;
  estado: EstadoConsulta;
  mensaje: string;
  interes: string;
  contacto: string;
  recibidoHace: string;
}

export const CONSULTAS_MOCK: ConsultaResumen[] = [
  {
    id: '1',
    nombre: 'María Rodríguez',
    iniciales: 'MR',
    canal: 'whatsapp',
    estado: 'nuevo',
    mensaje:
      'Hola, me interesa el flat de 2 dormitorios en Vista Mar. ¿Podemos coordinar una visita este sábado?',
    interes: 'Edificio Vista Mar · Flat 2 dormitorios',
    contacto: '+51 987 654 321',
    recibidoHace: 'hace 20 min',
  },
  {
    id: '2',
    nombre: 'Jorge Paredes',
    iniciales: 'JP',
    canal: 'landing',
    estado: 'nuevo',
    mensaje:
      'Busco un dúplex con vista al mar en Miraflores, presupuesto hasta US$ 250k. ¿Qué opciones tienen?',
    interes: 'Edificio Vista Mar · Dúplex 3 dormitorios',
    contacto: 'jparedes@gmail.com',
    recibidoHace: 'hace 2 h',
  },
  {
    id: '3',
    nombre: 'Lucía Campos',
    iniciales: 'LC',
    canal: 'whatsapp',
    estado: 'contactada',
    mensaje:
      'Gracias por la información, lo converso con mi esposo y les confirmo la visita.',
    interes: 'Edificio Vista Mar · Flat 1 dormitorio',
    contacto: '+51 999 111 222',
    recibidoHace: 'ayer',
  },
  {
    id: '4',
    nombre: 'Renzo Aguilar',
    iniciales: 'RA',
    canal: 'whatsapp',
    estado: 'contactada',
    mensaje:
      'Perfecto, nos vemos el jueves a las 4pm en el edificio. Gracias por la rapidez.',
    interes: 'Edificio Vista Mar · Flat 3 dormitorios',
    contacto: '+51 955 222 333',
    recibidoHace: 'hace 2 días',
  },
  {
    id: '5',
    nombre: 'Fiorella Núñez',
    iniciales: 'FN',
    canal: 'landing',
    estado: 'cerrada',
    mensaje: 'Ya separamos otro departamento, muchas gracias de todas formas.',
    interes: 'Edificio Vista Mar · Flat 2 dormitorios',
    contacto: 'fiorella.nunez@hotmail.com',
    recibidoHace: 'hace 5 días',
  },
];
