import type { Canal, TipoMensaje } from '@/lib/channels/types';

export interface ConversacionItem {
  id: string;
  contactId: string;
  contactNombre: string;
  contactTelefono: string | null;
  contactEmail: string | null;
  channelType: Canal;
  iaActiva: boolean;
  lastMessageAt: string | null;
  ultimoMensajeTexto: string | null;
  ultimoMensajeDireccion: 'entrante' | 'saliente' | null;
}

export interface MensajeItem {
  id: string;
  conversationId: string;
  direction: 'entrante' | 'saliente';
  senderType: 'contacto' | 'ia' | 'humano';
  type: TipoMensaje;
  text: string | null;
  timestamp: string;
}
