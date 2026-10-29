// Generated from supabase/migrations with:
//   npx supabase gen types typescript --db-url <postgres url> > lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      allowed_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          person_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          person_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowed_users_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      board_columns: {
        Row: {
          created_at: string
          default_owner_id: string | null
          description: string | null
          id: string
          key: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          default_owner_id?: string | null
          description?: string | null
          id?: string
          key: string
          name: string
          position: number
        }
        Update: {
          created_at?: string
          default_owner_id?: string | null
          description?: string | null
          id?: string
          key?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_columns_default_owner_id_fkey"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      people: {
        Row: {
          active: boolean
          created_at: string
          id: string
          initials: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          initials: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          initials?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          person_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id: string
          person_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          person_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          ticket_id: string
          uploaded_by: string | null
          uploaded_by_name: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          ticket_id: string
          uploaded_by?: string | null
          uploaded_by_name: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string | null
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_deletions: {
        Row: {
          attachment_paths: string[]
          client: string
          code: string
          column_name: string | null
          deleted_at: string
          deleted_by: string | null
          deleted_by_name: string
          id: string
          snapshot: Json
          ticket_id: string
          title: string
        }
        Insert: {
          attachment_paths?: string[]
          client: string
          code: string
          column_name?: string | null
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_name?: string
          id?: string
          snapshot: Json
          ticket_id: string
          title: string
        }
        Update: {
          attachment_paths?: string[]
          client?: string
          code?: string
          column_name?: string | null
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_name?: string
          id?: string
          snapshot?: Json
          ticket_id?: string
          title?: string
        }
        Relationships: []
      }
      ticket_moves: {
        Row: {
          from_column_id: string | null
          from_column_name: string | null
          id: string
          moved_at: string
          moved_by: string | null
          moved_by_name: string
          ticket_id: string
          to_column_id: string | null
          to_column_name: string | null
        }
        Insert: {
          from_column_id?: string | null
          from_column_name?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          moved_by_name?: string
          ticket_id: string
          to_column_id?: string | null
          to_column_name?: string | null
        }
        Update: {
          from_column_id?: string | null
          from_column_name?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          moved_by_name?: string
          ticket_id?: string
          to_column_id?: string | null
          to_column_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_moves_from_column_id_fkey"
            columns: ["from_column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_moves_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_moves_to_column_id_fkey"
            columns: ["to_column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notes: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to_id: string | null
          category_id: string | null
          client: string
          code: string
          column_entered_at: string
          column_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_received: string
          description: string | null
          first_site_visit: string | null
          id: string
          is_upgrade: boolean
          number: number
          owner_id: string | null
          scheduled_date: string | null
          site_address: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          category_id?: string | null
          client: string
          code?: string
          column_entered_at?: string
          column_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          date_received?: string
          description?: string | null
          first_site_visit?: string | null
          id?: string
          is_upgrade?: boolean
          number?: number
          owner_id?: string | null
          scheduled_date?: string | null
          site_address?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          category_id?: string | null
          client?: string
          code?: string
          column_entered_at?: string
          column_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          date_received?: string
          description?: string | null
          first_site_visit?: string | null
          id?: string
          is_upgrade?: boolean
          number?: number
          owner_id?: string | null
          scheduled_date?: string | null
          site_address?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_column: {
        Args: { p_name: string; p_description?: string | null; p_default_owner_id?: string | null }
        Returns: {
          created_at: string
          default_owner_id: string | null
          description: string | null
          id: string
          key: string
          name: string
          position: number
        }
        SetofOptions: {
          from: "*"
          to: "board_columns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_display_name: { Args: never; Returns: string }
      default_column_id: { Args: never; Returns: string }
      is_allowed: { Args: never; Returns: boolean }
      is_email_allowed: { Args: { p_email: string }; Returns: boolean }
      reorder_columns: { Args: { p_ids: string[] }; Returns: undefined }
      move_ticket: {
        Args: { p_column_id: string; p_ticket_id: string }
        Returns: {
          assigned_to_id: string | null
          category_id: string | null
          client: string
          code: string
          column_entered_at: string
          column_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_received: string
          description: string | null
          first_site_visit: string | null
          id: string
          is_upgrade: boolean
          number: number
          owner_id: string | null
          scheduled_date: string | null
          site_address: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

