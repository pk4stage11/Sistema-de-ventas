/**
 * Tipos de la base de datos, escritos a mano a partir de las migraciones en
 * supabase/migrations/ (no hay todavía un proyecto Supabase enlazado para
 * generarlos automáticamente).
 *
 * `Relationships` va vacío en todas las tablas: el codegen real de Supabase
 * lo llena con metadata de foreign keys para habilitar embeds tipados
 * (`.select('*, units(*)')`); aquí no la necesitamos todavía y dejarla vacía
 * es válida para el tipo `GenericTable` que exige @supabase/postgrest-js.
 *
 * Una vez que el proyecto esté enlazado (`supabase link`), reemplazar este
 * archivo con la salida real de:
 *
 *   npx supabase gen types typescript --linked > lib/supabase/database.types.ts
 *
 * y volver a aplicar cualquier ajuste manual que siga haciendo falta.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          org_id: string;
          full_name: string;
          role: 'admin' | 'asesor' | 'supervisor';
          phone: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          full_name: string;
          role: 'admin' | 'asesor' | 'supervisor';
          phone?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          org_id: string;
          type: 'whatsapp' | 'messenger' | 'instagram' | 'landing';
          name: string;
          external_id: string | null;
          config: Json;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          type: 'whatsapp' | 'messenger' | 'instagram' | 'landing';
          name: string;
          external_id?: string | null;
          config?: Json;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          org_id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          external_ids: Json;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          external_ids?: Json;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          org_id: string;
          contact_id: string;
          channel_id: string;
          external_thread_id: string;
          assigned_user_id: string | null;
          ia_activa: boolean;
          estado: 'abierta' | 'cerrada';
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          contact_id: string;
          channel_id: string;
          external_thread_id: string;
          assigned_user_id?: string | null;
          ia_activa?: boolean;
          estado?: 'abierta' | 'cerrada';
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          org_id: string;
          conversation_id: string;
          direction: 'entrante' | 'saliente';
          sender_type: 'contacto' | 'ia' | 'humano';
          sender_user_id: string | null;
          type:
            | 'texto'
            | 'imagen'
            | 'audio'
            | 'video'
            | 'documento'
            | 'ubicacion'
            | 'contacto'
            | 'sticker'
            | 'sistema'
            | 'no_soportado';
          text: string | null;
          media: Json;
          message_external_id: string;
          timestamp: string;
          raw_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          conversation_id: string;
          direction: 'entrante' | 'saliente';
          sender_type: 'contacto' | 'ia' | 'humano';
          sender_user_id?: string | null;
          type:
            | 'texto'
            | 'imagen'
            | 'audio'
            | 'video'
            | 'documento'
            | 'ubicacion'
            | 'contacto'
            | 'sticker'
            | 'sistema'
            | 'no_soportado';
          text?: string | null;
          media?: Json;
          message_external_id: string;
          timestamp: string;
          raw_payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          org_id: string;
          contact_id: string;
          project_id: string | null;
          assigned_user_id: string | null;
          estado:
            | 'nuevo'
            | 'calificando'
            | 'calificado'
            | 'cita_agendada'
            | 'visita_realizada'
            | 'cita_no_asistida'
            | 'cita_reprogramada'
            | 'propuesta_enviada'
            | 'reserva_pendiente'
            | 'cerrado_ganado'
            | 'cerrado_perdido'
            | 'derivado_humano';
          score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          contact_id: string;
          project_id?: string | null;
          assigned_user_id?: string | null;
          estado?: Database['public']['Tables']['leads']['Row']['estado'];
          score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      lead_qualification: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          tipo_inmueble: string | null;
          distrito: string | null;
          presupuesto_min: number | null;
          presupuesto_max: number | null;
          forma_pago: 'contado' | 'credito_hipotecario' | null;
          banco: string | null;
          precalificado: boolean | null;
          plazo_decision: string | null;
          primera_vivienda: boolean | null;
          notas: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          tipo_inmueble?: string | null;
          distrito?: string | null;
          presupuesto_min?: number | null;
          presupuesto_max?: number | null;
          forma_pago?: 'contado' | 'credito_hipotecario' | null;
          banco?: string | null;
          precalificado?: boolean | null;
          plazo_decision?: string | null;
          primera_vivienda?: boolean | null;
          notas?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lead_qualification']['Insert']>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          distrito: string | null;
          direccion: string | null;
          descripcion: string | null;
          fecha_entrega: string | null;
          avance_obra: string | null;
          areas_comunes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          distrito?: string | null;
          direccion?: string | null;
          descripcion?: string | null;
          fecha_entrega?: string | null;
          avance_obra?: string | null;
          areas_comunes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
        Relationships: [];
      };
      units: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          codigo: string;
          tipologia: string | null;
          m2: number | null;
          dormitorios: number | null;
          banos: number | null;
          piso: number | null;
          precio: number;
          estado: 'disponible' | 'reservado' | 'vendido';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          project_id: string;
          codigo: string;
          tipologia?: string | null;
          m2?: number | null;
          dormitorios?: number | null;
          banos?: number | null;
          piso?: number | null;
          precio: number;
          estado?: 'disponible' | 'reservado' | 'vendido';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['units']['Insert']>;
        Relationships: [];
      };
      unit_media: {
        Row: {
          id: string;
          org_id: string;
          unit_id: string;
          tipo: 'foto' | 'plano' | 'video';
          storage_path: string;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          unit_id: string;
          tipo: 'foto' | 'plano' | 'video';
          storage_path: string;
          orden?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['unit_media']['Insert']>;
        Relationships: [];
      };
      availability_rules: {
        Row: {
          id: string;
          org_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
          duracion_visita_minutos: number;
          buffer_minutos: number;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
          duracion_visita_minutos?: number;
          buffer_minutos?: number;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['availability_rules']['Insert']>;
        Relationships: [];
      };
      visits: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          project_id: string | null;
          unit_id: string | null;
          asesor_id: string;
          inicio: string;
          fin: string;
          google_event_id: string | null;
          sync_status: 'pendiente_sincronizacion' | 'sincronizado' | 'error';
          asistencia: 'pendiente' | 'asistio' | 'no_asistio' | 'reprogramada';
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          project_id?: string | null;
          unit_id?: string | null;
          asesor_id: string;
          inicio: string;
          fin: string;
          google_event_id?: string | null;
          sync_status?: 'pendiente_sincronizacion' | 'sincronizado' | 'error';
          asistencia?: 'pendiente' | 'asistio' | 'no_asistio' | 'reprogramada';
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['visits']['Insert']>;
        Relationships: [];
      };
      calendar_credentials: {
        Row: {
          id: string;
          org_id: string;
          calendar_id: string;
          refresh_token_cifrado: string;
          access_token_cache: string | null;
          token_expira_en: string | null;
          conectado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          calendar_id: string;
          refresh_token_cifrado: string;
          access_token_cache?: string | null;
          token_expira_en?: string | null;
          conectado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['calendar_credentials']['Insert']>;
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          unit_id: string;
          condiciones: Json;
          storage_path: string | null;
          generado_por: 'ia' | 'humano';
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          unit_id: string;
          condiciones?: Json;
          storage_path?: string | null;
          generado_por: 'ia' | 'humano';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>;
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          org_id: string;
          lead_id: string;
          unit_id: string;
          estado: 'pendiente' | 'aprobada' | 'rechazada' | 'mas_informacion';
          monto_separacion: number | null;
          comprobante_url: string | null;
          creado_por_ia: boolean;
          creado_por: string | null;
          revisado_por: string | null;
          revisado_en: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          lead_id: string;
          unit_id: string;
          estado?: 'pendiente' | 'aprobada' | 'rechazada' | 'mas_informacion';
          monto_separacion?: number | null;
          comprobante_url?: string | null;
          creado_por_ia?: boolean;
          creado_por?: string | null;
          revisado_por?: string | null;
          revisado_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>;
        Relationships: [];
      };
      agent_runs: {
        Row: {
          id: string;
          org_id: string;
          conversation_id: string;
          lead_id: string | null;
          input: Json | null;
          tools_called: Json;
          output: string | null;
          tokens_entrada: number | null;
          tokens_salida: number | null;
          latencia_ms: number | null;
          modelo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          conversation_id: string;
          lead_id?: string | null;
          input?: Json | null;
          tools_called?: Json;
          output?: string | null;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
          latencia_ms?: number | null;
          modelo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['agent_runs']['Insert']>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          accion: string;
          entidad: string;
          entidad_id: string | null;
          detalle: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string | null;
          accion: string;
          entidad: string;
          entidad_id?: string | null;
          detalle?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
        Relationships: [];
      };
      catalog_embeddings: {
        Row: {
          id: string;
          org_id: string;
          project_id: string | null;
          unit_id: string | null;
          content: string;
          // pgvector viaja como texto por el cliente JS (ej. "[0.01,0.02,...]").
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          project_id?: string | null;
          unit_id?: string | null;
          content: string;
          embedding?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['catalog_embeddings']['Insert']>;
        Relationships: [];
      };
      job_queue: {
        Row: {
          id: string;
          org_id: string;
          tipo: 'procesar_mensaje' | 'enviar_recordatorio' | 'sincronizar_calendario';
          payload: Json;
          message_external_id: string | null;
          estado: 'pendiente' | 'procesando' | 'completado' | 'fallido';
          intentos: number;
          max_intentos: number;
          disponible_en: string;
          error: string | null;
          created_at: string;
          procesado_en: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          tipo: 'procesar_mensaje' | 'enviar_recordatorio' | 'sincronizar_calendario';
          payload: Json;
          message_external_id?: string | null;
          estado?: 'pendiente' | 'procesando' | 'completado' | 'fallido';
          intentos?: number;
          max_intentos?: number;
          disponible_en?: string;
          error?: string | null;
          created_at?: string;
          procesado_en?: string | null;
        };
        Update: Partial<Database['public']['Tables']['job_queue']['Insert']>;
        Relationships: [];
      };
      whatsapp_templates: {
        Row: {
          id: string;
          org_id: string;
          nombre: string;
          idioma: string;
          categoria: 'marketing' | 'utilidad' | 'autenticacion';
          estado_meta: 'pendiente' | 'aprobada' | 'rechazada';
          variables: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          nombre: string;
          idioma?: string;
          categoria: 'marketing' | 'utilidad' | 'autenticacion';
          estado_meta?: 'pendiente' | 'aprobada' | 'rechazada';
          variables?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['whatsapp_templates']['Insert']>;
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          org_id: string;
          contact_id: string;
          canal: string;
          texto_mostrado: string;
          otorgado: boolean;
          fecha: string;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          contact_id: string;
          canal: string;
          texto_mostrado: string;
          otorgado: boolean;
          fecha?: string;
          ip?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consents']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      calendar_connection_status: {
        Row: {
          org_id: string;
          calendar_id: string;
          conectado_por: string | null;
          created_at: string;
          updated_at: string;
          token_vigente: boolean;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
