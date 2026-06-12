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
      afiliados: {
        Row: {
          address_city: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          consent_lgpd: boolean
          consent_lgpd_at: string | null
          cpf: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          joined_at: string | null
          matricula: string
          phone: string | null
          photo_url: string | null
          profession: string | null
          rg: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["afiliado_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          consent_lgpd?: boolean
          consent_lgpd_at?: string | null
          cpf: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          joined_at?: string | null
          matricula: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          rg?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["afiliado_status"]
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          consent_lgpd?: boolean
          consent_lgpd_at?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          joined_at?: string | null
          matricula?: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          rg?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["afiliado_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afiliados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dependentes: {
        Row: {
          afiliado_id: string
          birth_date: string | null
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          relation: string | null
          tenant_id: string
        }
        Insert: {
          afiliado_id: string
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          full_name: string
          id?: string
          relation?: string | null
          tenant_id: string
        }
        Update: {
          afiliado_id?: string
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          relation?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependentes_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependentes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          afiliado_id: string | null
          categoria: Database["public"]["Enums"]["documento_categoria"]
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          tenant_id: string
          titulo: string
          updated_at: string
          visibilidade: Database["public"]["Enums"]["documento_visibilidade"]
        }
        Insert: {
          afiliado_id?: string | null
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path: string
          tenant_id: string
          titulo: string
          updated_at?: string
          visibilidade?: Database["public"]["Enums"]["documento_visibilidade"]
        }
        Update: {
          afiliado_id?: string | null
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
          visibilidade?: Database["public"]["Enums"]["documento_visibilidade"]
        }
        Relationships: [
          {
            foreignKeyName: "documentos_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          afiliado_id: string
          competencia: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["mensalidade_status"]
          tenant_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          afiliado_id: string
          competencia: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["mensalidade_status"]
          tenant_id: string
          updated_at?: string
          valor: number
        }
        Update: {
          afiliado_id?: string
          competencia?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["mensalidade_status"]
          tenant_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_andamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_andamento: string
          descricao: string
          id: string
          processo_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_andamento?: string
          descricao: string
          id?: string
          processo_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_andamento?: string
          descricao?: string
          id?: string
          processo_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processo_andamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_andamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          advogado_responsavel: string | null
          afiliado_id: string | null
          comarca: string | null
          created_at: string
          created_by: string | null
          data_distribuicao: string | null
          descricao: string | null
          id: string
          numero_processo: string
          proxima_audiencia: string | null
          status: Database["public"]["Enums"]["processo_status"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["processo_tipo"]
          titulo: string
          uf: string | null
          updated_at: string
          valor_causa: number | null
          vara: string | null
        }
        Insert: {
          advogado_responsavel?: string | null
          afiliado_id?: string | null
          comarca?: string | null
          created_at?: string
          created_by?: string | null
          data_distribuicao?: string | null
          descricao?: string | null
          id?: string
          numero_processo: string
          proxima_audiencia?: string | null
          status?: Database["public"]["Enums"]["processo_status"]
          tenant_id: string
          tipo?: Database["public"]["Enums"]["processo_tipo"]
          titulo: string
          uf?: string | null
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Update: {
          advogado_responsavel?: string | null
          afiliado_id?: string | null
          comarca?: string | null
          created_at?: string
          created_by?: string | null
          data_distribuicao?: string | null
          descricao?: string | null
          id?: string
          numero_processo?: string
          proxima_audiencia?: string | null
          status?: Database["public"]["Enums"]["processo_status"]
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["processo_tipo"]
          titulo?: string
          uf?: string | null
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string
          cnpj: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          next_matricula: number
          primary_color: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          accent_color?: string
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          next_matricula?: number
          primary_color?: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          accent_color?: string
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          next_matricula?: number
          primary_color?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_super_admin: { Args: never; Returns: Json }
      create_tenant_as_super_admin: {
        Args: {
          _accent_color?: string
          _admin_user_id?: string
          _name: string
          _primary_color?: string
          _slug: string
        }
        Returns: string
      }
      current_tenant_id: { Args: never; Returns: string }
      generate_mensalidades_lote: {
        Args: {
          _competencia: string
          _due_day?: number
          _tenant_id: string
          _valor: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      next_matricula: { Args: { _tenant_id: string }; Returns: string }
      update_tenant_branding: {
        Args: {
          _accent_color: string
          _logo_url: string
          _name: string
          _primary_color: string
          _tenant_id: string
        }
        Returns: undefined
      }
      verify_carteirinha: {
        Args: { _afiliado_id: string }
        Returns: {
          full_name: string
          id: string
          joined_at: string
          matricula: string
          photo_url: string
          status: Database["public"]["Enums"]["afiliado_status"]
          tenant_logo: string
          tenant_name: string
          tenant_primary_color: string
        }[]
      }
    }
    Enums: {
      afiliado_status: "pendente" | "ativo" | "inativo" | "suspenso"
      app_role: "super_admin" | "admin" | "staff" | "afiliado"
      documento_categoria:
        | "estatuto"
        | "ata"
        | "convencao"
        | "comunicado"
        | "contrato"
        | "outro"
      documento_visibilidade: "publico" | "afiliados" | "staff"
      mensalidade_status:
        | "pendente"
        | "pago"
        | "atrasado"
        | "isento"
        | "cancelado"
      processo_status:
        | "aberto"
        | "em_andamento"
        | "suspenso"
        | "encerrado"
        | "arquivado"
      processo_tipo:
        | "trabalhista"
        | "civel"
        | "previdenciario"
        | "tributario"
        | "administrativo"
        | "outro"
      tenant_status: "ativo" | "suspenso" | "cancelado"
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
    Enums: {
      afiliado_status: ["pendente", "ativo", "inativo", "suspenso"],
      app_role: ["super_admin", "admin", "staff", "afiliado"],
      documento_categoria: [
        "estatuto",
        "ata",
        "convencao",
        "comunicado",
        "contrato",
        "outro",
      ],
      documento_visibilidade: ["publico", "afiliados", "staff"],
      mensalidade_status: [
        "pendente",
        "pago",
        "atrasado",
        "isento",
        "cancelado",
      ],
      processo_status: [
        "aberto",
        "em_andamento",
        "suspenso",
        "encerrado",
        "arquivado",
      ],
      processo_tipo: [
        "trabalhista",
        "civel",
        "previdenciario",
        "tributario",
        "administrativo",
        "outro",
      ],
      tenant_status: ["ativo", "suspenso", "cancelado"],
    },
  },
} as const
