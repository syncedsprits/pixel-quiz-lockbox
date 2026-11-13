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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      project_access_sessions: {
        Row: {
          created_at: string
          email: string | null
          email_verified_at: string | null
          expires_at: string
          id: string
          otp_attempts: number
          otp_hash: string | null
          otp_send_count: number
          otp_sent_at: string | null
          otp_window_started_at: string | null
          project_id: string
          quiz_passed_at: string
          quiz_score: number
          quiz_total: number
          role: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          expires_at?: string
          id?: string
          otp_attempts?: number
          otp_hash?: string | null
          otp_send_count?: number
          otp_sent_at?: string | null
          otp_window_started_at?: string | null
          project_id: string
          quiz_passed_at?: string
          quiz_score: number
          quiz_total: number
          role?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified_at?: string | null
          expires_at?: string
          id?: string
          otp_attempts?: number
          otp_hash?: string | null
          otp_send_count?: number
          otp_sent_at?: string | null
          otp_window_started_at?: string | null
          project_id?: string
          quiz_passed_at?: string
          quiz_score?: number
          quiz_total?: number
          role?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      project_knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          doc_id: string
          doc_name: string
          embedding: string
          id: string
          project_id: string
          source_version: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          doc_id: string
          doc_name: string
          embedding: string
          id?: string
          project_id: string
          source_version: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          doc_id?: string
          doc_name?: string
          embedding?: string
          id?: string
          project_id?: string
          source_version?: string
        }
        Relationships: []
      }
      project_uploads: {
        Row: {
          category: string
          created_at: string
          extension: string
          extracted: Json | null
          id: string
          mime_type: string
          name: string
          processing: string
          project_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploader_email: string | null
        }
        Insert: {
          category: string
          created_at?: string
          extension: string
          extracted?: Json | null
          id?: string
          mime_type?: string
          name: string
          processing?: string
          project_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          uploader_email?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          extension?: string
          extracted?: Json | null
          id?: string
          mime_type?: string
          name?: string
          processing?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
          uploader_email?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          display_name: string
          email: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          display_name: string
          email: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          display_name?: string
          email?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_project_chunks: {
        Args: {
          _count: number
          _doc_ids: string[]
          _project_id: string
          _query: string
        }
        Returns: {
          chunk_index: number
          content: string
          doc_id: string
          doc_name: string
          similarity: number
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
