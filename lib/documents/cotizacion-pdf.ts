import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface DatosCotizacion {
  organizacion: string;
  proyecto: string;
  distrito: string | null;
  unidadCodigo: string;
  tipologia: string | null;
  m2: number | null;
  piso: number | null;
  precioSoles: number;
  condiciones?: {
    cuotaInicialSoles?: number;
    plazoAnios?: number;
    cuotaMensualEstimadaSoles?: number;
  };
  fecha: string; // ya formateada, ej. "1 de agosto de 2026"
}

const formatoSoles = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
});

/** Genera un PDF de cotización simple (una página, sin plantilla externa). */
export async function generarCotizacionPdf(
  datos: DatosCotizacion,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([595, 842]); // A4
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const fuenteNegrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  const tealMarca = rgb(0x14 / 255, 0x91 / 255, 0x9b / 255);
  const textoOscuro = rgb(0x0e / 255, 0x0e / 255, 0x0e / 255);
  const textoSutil = rgb(0x77 / 255, 0x77 / 255, 0x77 / 255);

  let y = 780;
  const margenX = 56;

  pagina.drawText(datos.organizacion, {
    x: margenX,
    y,
    size: 20,
    font: fuenteNegrita,
    color: tealMarca,
  });
  y -= 22;
  pagina.drawText('Cotización referencial', {
    x: margenX,
    y,
    size: 12,
    font: fuente,
    color: textoSutil,
  });
  y -= 14;
  pagina.drawText(datos.fecha, {
    x: margenX,
    y,
    size: 10,
    font: fuente,
    color: textoSutil,
  });

  y -= 40;
  pagina.drawLine({
    start: { x: margenX, y },
    end: { x: 595 - margenX, y },
    thickness: 1,
    color: rgb(0.92, 0.92, 0.91),
  });

  y -= 32;
  pagina.drawText(datos.proyecto, {
    x: margenX,
    y,
    size: 16,
    font: fuenteNegrita,
    color: textoOscuro,
  });
  if (datos.distrito) {
    y -= 18;
    pagina.drawText(datos.distrito, {
      x: margenX,
      y,
      size: 11,
      font: fuente,
      color: textoSutil,
    });
  }

  y -= 34;
  const filas: [string, string][] = [
    ['Unidad', datos.unidadCodigo],
    ['Tipología', datos.tipologia ?? '—'],
    ['Área', datos.m2 ? `${datos.m2} m²` : '—'],
    ['Piso', datos.piso != null ? String(datos.piso) : '—'],
    ['Precio', formatoSoles.format(datos.precioSoles)],
  ];
  for (const [etiqueta, valor] of filas) {
    pagina.drawText(etiqueta, {
      x: margenX,
      y,
      size: 11,
      font: fuente,
      color: textoSutil,
    });
    pagina.drawText(valor, {
      x: margenX + 160,
      y,
      size: 11,
      font: fuenteNegrita,
      color: textoOscuro,
    });
    y -= 20;
  }

  if (datos.condiciones) {
    y -= 16;
    pagina.drawText('Simulación de financiamiento (referencial)', {
      x: margenX,
      y,
      size: 12,
      font: fuenteNegrita,
      color: textoOscuro,
    });
    y -= 20;
    const filasFinanciamiento: [string, string][] = [
      ...(datos.condiciones.cuotaInicialSoles != null
        ? ([
            ['Cuota inicial', formatoSoles.format(datos.condiciones.cuotaInicialSoles)],
          ] as [string, string][])
        : []),
      ...(datos.condiciones.plazoAnios != null
        ? ([['Plazo', `${datos.condiciones.plazoAnios} años`]] as [string, string][])
        : []),
      ...(datos.condiciones.cuotaMensualEstimadaSoles != null
        ? ([
            [
              'Cuota mensual estimada',
              formatoSoles.format(datos.condiciones.cuotaMensualEstimadaSoles),
            ],
          ] as [string, string][])
        : []),
    ];
    for (const [etiqueta, valor] of filasFinanciamiento) {
      pagina.drawText(etiqueta, {
        x: margenX,
        y,
        size: 11,
        font: fuente,
        color: textoSutil,
      });
      pagina.drawText(valor, {
        x: margenX + 160,
        y,
        size: 11,
        font: fuenteNegrita,
        color: textoOscuro,
      });
      y -= 20;
    }
  }

  pagina.drawText(
    'Documento referencial generado automáticamente. Precio, disponibilidad y condiciones de',
    { x: margenX, y: 70, size: 8.5, font: fuente, color: textoSutil },
  );
  pagina.drawText(
    'financiamiento sujetos a confirmación de un asesor. No constituye una oferta de crédito.',
    { x: margenX, y: 58, size: 8.5, font: fuente, color: textoSutil },
  );

  return pdf.save();
}
