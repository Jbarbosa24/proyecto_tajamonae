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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          accion: string
          created_at: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabla_afectada: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabla_afectada?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabla_afectada?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bloques: {
        Row: {
          id: string
          nombre: string
          pisos: number
        }
        Insert: {
          id: string
          nombre: string
          pisos?: number
        }
        Update: {
          id?: string
          nombre?: string
          pisos?: number
        }
        Relationships: []
      }
      creditos_diarios: {
        Row: {
          consumido: boolean
          created_at: string | null
          fecha: string
          id: string
          operario_id: string
          servicio_id: string | null
          tipo: string
        }
        Insert: {
          consumido?: boolean
          created_at?: string | null
          fecha?: string
          id?: string
          operario_id: string
          servicio_id?: string | null
          tipo: string
        }
        Update: {
          consumido?: boolean
          created_at?: string | null
          fecha?: string
          id?: string
          operario_id?: string
          servicio_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "creditos_diarios_operario_id_fkey"
            columns: ["operario_id"]
            isOneToOne: false
            referencedRelation: "operarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditos_diarios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean | null
          color_hex: string | null
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          created_at: string | null
          created_by: string | null
          id: string
          nit: string | null
          nombre_completo: string
          sigla: string
        }
        Insert: {
          activa?: boolean | null
          color_hex?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nit?: string | null
          nombre_completo: string
          sigla: string
        }
        Update: {
          activa?: boolean | null
          color_hex?: string | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nit?: string | null
          nombre_completo?: string
          sigla?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habitaciones: {
        Row: {
          bloque_id: string
          capacidad: number
          estado: string
          estado_aseo: string
          id: string
          piso: number
          ultima_actualizacion: string | null
        }
        Insert: {
          bloque_id: string
          capacidad?: number
          estado?: string
          estado_aseo?: string
          id: string
          piso?: number
          ultima_actualizacion?: string | null
        }
        Update: {
          bloque_id?: string
          capacidad?: number
          estado?: string
          estado_aseo?: string
          id?: string
          piso?: number
          ultima_actualizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habitaciones_bloque_id_fkey"
            columns: ["bloque_id"]
            isOneToOne: false
            referencedRelation: "bloques"
            referencedColumns: ["id"]
          },
        ]
      }
      importaciones_turno: {
        Row: {
          archivo_nombre: string
          empresa_id: string
          fecha_proceso: string | null
          id: string
          operarios_entrantes: Json | null
          operarios_salientes: Json | null
          procesado_por: string | null
        }
        Insert: {
          archivo_nombre: string
          empresa_id: string
          fecha_proceso?: string | null
          id?: string
          operarios_entrantes?: Json | null
          operarios_salientes?: Json | null
          procesado_por?: string | null
        }
        Update: {
          archivo_nombre?: string
          empresa_id?: string
          fecha_proceso?: string | null
          id?: string
          operarios_entrantes?: Json | null
          operarios_salientes?: Json | null
          procesado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "importaciones_turno_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importaciones_turno_procesado_por_fkey"
            columns: ["procesado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operarios: {
        Row: {
          activo: boolean | null
          cargo: string
          created_at: string | null
          dias_turno: string | null
          documento_identidad: string
          empresa_id: string
          fecha_ingreso_turno: string | null
          fecha_salida_turno: string | null
          genero: string | null
          habitacion_id: string | null
          id: string
          nombre_completo: string
          rfid_uid: string | null
          tipo_cargo: string | null
        }
        Insert: {
          activo?: boolean | null
          cargo: string
          created_at?: string | null
          dias_turno?: string | null
          documento_identidad: string
          empresa_id: string
          fecha_ingreso_turno?: string | null
          fecha_salida_turno?: string | null
          genero?: string | null
          habitacion_id?: string | null
          id?: string
          nombre_completo: string
          rfid_uid?: string | null
          tipo_cargo?: string | null
        }
        Update: {
          activo?: boolean | null
          cargo?: string
          created_at?: string | null
          dias_turno?: string | null
          documento_identidad?: string
          empresa_id?: string
          fecha_ingreso_turno?: string | null
          fecha_salida_turno?: string | null
          genero?: string | null
          habitacion_id?: string | null
          id?: string
          nombre_completo?: string
          rfid_uid?: string | null
          tipo_cargo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operarios_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean | null
          created_at: string | null
          empresa_id: string | null
          id: string
          nombre_completo: string
          rol: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id: string
          nombre_completo: string
          rol: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nombre_completo?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_rol_fkey"
            columns: ["rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["nombre"]
          },
          {
            foreignKeyName: "perfiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_camareria: {
        Row: {
          aseadora_id: string | null
          created_at: string | null
          estado: string
          fecha: string
          foto_antes: string | null
          foto_despues: string | null
          habitacion_id: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          lista_chequeo: Json | null
          observaciones: string | null
        }
        Insert: {
          aseadora_id?: string | null
          created_at?: string | null
          estado?: string
          fecha?: string
          foto_antes?: string | null
          foto_despues?: string | null
          habitacion_id: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          lista_chequeo?: Json | null
          observaciones?: string | null
        }
        Update: {
          aseadora_id?: string | null
          created_at?: string | null
          estado?: string
          fecha?: string
          foto_antes?: string | null
          foto_despues?: string | null
          habitacion_id?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          lista_chequeo?: Json | null
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_camareria_aseadora_id_fkey"
            columns: ["aseadora_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_camareria_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_lavanderia: {
        Row: {
          camisas: number
          capuchones: number
          created_at: string | null
          estado: string
          fecha: string
          foto_tula_entregada_url: string | null
          foto_tula_recibida_url: string | null
          habitacion_id: string
          id: string
          jeans: number
          operario_id: string | null
          overoles: number
          pantalonetas: number
          registrado_por: string | null
          toallas: number
          updated_at: string | null
        }
        Insert: {
          camisas?: number
          capuchones?: number
          created_at?: string | null
          estado?: string
          fecha?: string
          foto_tula_entregada_url?: string | null
          foto_tula_recibida_url?: string | null
          habitacion_id: string
          id?: string
          jeans?: number
          operario_id?: string | null
          overoles?: number
          pantalonetas?: number
          registrado_por?: string | null
          toallas?: number
          updated_at?: string | null
        }
        Update: {
          camisas?: number
          capuchones?: number
          created_at?: string | null
          estado?: string
          fecha?: string
          foto_tula_entregada_url?: string | null
          foto_tula_recibida_url?: string | null
          habitacion_id?: string
          id?: string
          jeans?: number
          operario_id?: string | null
          overoles?: number
          pantalonetas?: number
          registrado_por?: string | null
          toallas?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_lavanderia_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_lavanderia_operario_id_fkey"
            columns: ["operario_id"]
            isOneToOne: false
            referencedRelation: "operarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_lavanderia_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          created_at: string | null
          empresa_id: string
          es_manual: boolean | null
          fecha: string
          hora_registro: string
          id: string
          motivo_manual: string | null
          operario_id: string
          porcentaje_impuesto: number
          registrado_por: string | null
          rfid_uid_lectura: string | null
          tipo: string
          tipo_impuesto: string
          valor_base: number
          valor_impuesto: number
          valor_total: number
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          es_manual?: boolean | null
          fecha?: string
          hora_registro?: string
          id?: string
          motivo_manual?: string | null
          operario_id: string
          porcentaje_impuesto?: number
          registrado_por?: string | null
          rfid_uid_lectura?: string | null
          tipo: string
          tipo_impuesto?: string
          valor_base?: number
          valor_impuesto?: number
          valor_total?: number
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          es_manual?: boolean | null
          fecha?: string
          hora_registro?: string
          id?: string
          motivo_manual?: string | null
          operario_id?: string
          porcentaje_impuesto?: number
          registrado_por?: string | null
          rfid_uid_lectura?: string | null
          tipo?: string
          tipo_impuesto?: string
          valor_base?: number
          valor_impuesto?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_operario_id_fkey"
            columns: ["operario_id"]
            isOneToOne: false
            referencedRelation: "operarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_empresa: {
        Row: {
          empresa_id: string
          id: string
          tipo_servicio: string
          updated_at: string | null
          valor_unitario: number
        }
        Insert: {
          empresa_id: string
          id?: string
          tipo_servicio: string
          updated_at?: string | null
          valor_unitario?: number
        }
        Update: {
          empresa_id?: string
          id?: string
          tipo_servicio?: string
          updated_at?: string | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generar_creditos_checkin: {
        Args: { p_dias: number; p_operario_id: string }
        Returns: undefined
      }
      get_user_role: { Args: never; Returns: string }
      procesar_cambio_turno: {
        Args: {
          p_empresa_id: string
          p_operarios_entrantes: Json
          p_procesado_por: string
        }
        Returns: Json
      }
      verificar_duplicado_servicio: {
        Args: { p_fecha?: string; p_operario_id: string; p_tipo: string }
        Returns: boolean
      }
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
