import { describe, expect, it } from 'vitest';
import {
  esEnvioHoneypot,
  landingLeadSchema,
  normalizeLandingSubmission,
} from '@/lib/channels/landing';
import { inboundMessageSchema } from '@/lib/channels/types';

const envioValido = {
  nombre: 'Renzo Aguilar',
  telefono: '+51955222333',
  mensaje: 'Quiero más información sobre el proyecto',
  proyecto_interes: 'Edificio Vista Mar',
  consiente: true as const,
  texto_consentimiento: 'Acepto que InteresArte me contacte por este medio.',
  sitio_web: '',
};

describe('landingLeadSchema', () => {
  it('acepta un envío válido con teléfono', () => {
    expect(landingLeadSchema.safeParse(envioValido).success).toBe(true);
  });

  it('acepta un envío válido con solo email', () => {
    const { telefono: _telefono, ...resto } = envioValido;
    const conEmail = { ...resto, email: 'renzo@example.com' };
    expect(landingLeadSchema.safeParse(conEmail).success).toBe(true);
  });

  it('rechaza si no hay ni teléfono ni email', () => {
    const { telefono: _telefono, ...sinContacto } = envioValido;
    expect(landingLeadSchema.safeParse(sinContacto).success).toBe(false);
  });

  it('rechaza si no se marcó el consentimiento', () => {
    const sinConsentimiento = { ...envioValido, consiente: false };
    expect(landingLeadSchema.safeParse(sinConsentimiento).success).toBe(false);
  });
});

describe('esEnvioHoneypot', () => {
  it('false cuando el campo honeypot llega vacío (envío humano)', () => {
    const data = landingLeadSchema.parse(envioValido);
    expect(esEnvioHoneypot(data)).toBe(false);
  });

  it('true cuando el campo honeypot viene relleno (bot)', () => {
    const data = landingLeadSchema.parse({
      ...envioValido,
      sitio_web: 'https://spam.com',
    });
    expect(esEnvioHoneypot(data)).toBe(true);
  });
});

describe('normalizeLandingSubmission', () => {
  it('produce un InboundMessage válido según el schema de Fase 0', () => {
    const data = landingLeadSchema.parse(envioValido);
    const msg = normalizeLandingSubmission(data);

    expect(() => inboundMessageSchema.parse(msg)).not.toThrow();
    expect(msg.channel).toBe('landing');
    expect(msg.external_contact_id).toBe('+51955222333');
    expect(msg.contact_name).toBe('Renzo Aguilar');
    expect(msg.text).toContain('Quiero más información');
    expect(msg.text).toContain('Edificio Vista Mar');
  });

  it('usa el email como identidad cuando no hay teléfono', () => {
    const { telefono: _telefono, ...resto } = envioValido;
    const data = landingLeadSchema.parse({ ...resto, email: 'renzo@example.com' });
    const msg = normalizeLandingSubmission(data);
    expect(msg.external_contact_id).toBe('renzo@example.com');
  });
});
