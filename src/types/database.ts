/*
 * Tipi TypeScript generati dallo schema Supabase del Digital Twin.
 * Progetto: jovkvuhgfiikvwepqnnc ("Tirocinio").
 *
 * NON modificare a mano la sezione `Database`: è l'output di
 *   supabase gen types typescript  (via MCP generate_typescript_types).
 * Rigenerare dopo ogni migration. Gli alias di convenienza in fondo
 * sono aggiunti a mano e usati in tutta l'app.
 *
 * Dominio: l'unico attore è il Medico (= ogni utente autenticato). I pazienti
 * sono entità dati nella tabella `pazienti` (medico_id -> profiles).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campioni: {
        Row: {
          bpm: number | null
          dia: number | null
          glicemia: number | null
          id: number
          minuto: number
          peso: number | null
          rilevato_il: string
          sat: number | null
          simulazione_id: string
          sys: number | null
        }
        Insert: {
          bpm?: number | null
          dia?: number | null
          glicemia?: number | null
          id?: never
          minuto: number
          peso?: number | null
          rilevato_il: string
          sat?: number | null
          simulazione_id: string
          sys?: number | null
        }
        Update: {
          bpm?: number | null
          dia?: number | null
          glicemia?: number | null
          id?: never
          minuto?: number
          peso?: number | null
          rilevato_il?: string
          sat?: number | null
          simulazione_id?: string
          sys?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campioni_simulazione_id_fkey"
            columns: ["simulazione_id"]
            isOneToOne: false
            referencedRelation: "simulazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      pazienti: {
        Row: {
          cognome: string
          creato_il: string
          data_nascita: string | null
          id: string
          medico_id: string
          nome: string
          physical_health_score: number | null
          trend_peggioramento: number | null
          stato_psichico: number | null
          urgenza_dialogo_amica: number | null
        }
        Insert: {
          cognome: string
          creato_il?: string
          data_nascita?: string | null
          id?: string
          medico_id: string
          nome: string
          physical_health_score?: number | null
          trend_peggioramento?: number | null
          stato_psichico?: number | null
          urgenza_dialogo_amica?: number | null
        }
        Update: {
          cognome?: string
          creato_il?: string
          data_nascita?: string | null
          id?: string
          medico_id?: string
          nome?: string
          physical_health_score?: number | null
          trend_peggioramento?: number | null
          stato_psichico?: number | null
          urgenza_dialogo_amica?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pazienti_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cognome: string | null
          creato_il: string
          id: string
          nome: string | null
          telefono: string | null
        }
        Insert: {
          cognome?: string | null
          creato_il?: string
          id: string
          nome?: string | null
          telefono?: string | null
        }
        Update: {
          cognome?: string | null
          creato_il?: string
          id?: string
          nome?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      simulazioni: {
        Row: {
          creato_da: string
          creato_il: string
          dati: Json
          descrizione: string
          durata_minuti: number
          id: string
          paziente_id: string | null
          profilo_clinico: string | null
          sensori: string[]
        }
        Insert: {
          creato_da: string
          creato_il?: string
          dati?: Json
          descrizione: string
          durata_minuti: number
          id?: string
          paziente_id?: string | null
          profilo_clinico?: string | null
          sensori?: string[]
        }
        Update: {
          creato_da?: string
          creato_il?: string
          dati?: Json
          descrizione?: string
          durata_minuti?: number
          id?: string
          paziente_id?: string | null
          profilo_clinico?: string | null
          sensori?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "simulazioni_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

/* --- Alias di convenienza (aggiunti a mano, usati in tutta l'app) --- */

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Paziente = Database["public"]["Tables"]["pazienti"]["Row"]
export type Simulazione = Database["public"]["Tables"]["simulazioni"]["Row"]
export type Campione = Database["public"]["Tables"]["campioni"]["Row"]
