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
      attachments: {
        Row: {
          chat_message_id: string | null
          created_at: string
          filename: string
          id: string
          kind: string
          mime_type: string
          ocr_text: string | null
          storage_path: string
          task_entry_id: string | null
        }
        Insert: {
          chat_message_id?: string | null
          created_at?: string
          filename: string
          id?: string
          kind: string
          mime_type: string
          ocr_text?: string | null
          storage_path: string
          task_entry_id?: string | null
        }
        Update: {
          chat_message_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          kind?: string
          mime_type?: string
          ocr_text?: string | null
          storage_path?: string
          task_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_task_entry_id_fkey"
            columns: ["task_entry_id"]
            isOneToOne: false
            referencedRelation: "task_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          referenced_task_entry_id: string | null
          role: string
          text: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          referenced_task_entry_id?: string | null
          role: string
          text: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          referenced_task_entry_id?: string | null
          role?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_referenced_task_entry_id_fkey"
            columns: ["referenced_task_entry_id"]
            isOneToOne: false
            referencedRelation: "task_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          note: string | null
          start_time: string | null
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          note?: string | null
          start_time?: string | null
          team_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          note?: string | null
          start_time?: string | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string
          selected_reward_id: string | null
          team_id: string | null
          updated_at: string
          xp: number
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name?: string
          role?: string
          selected_reward_id?: string | null
          team_id?: string | null
          updated_at?: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          selected_reward_id?: string | null
          team_id?: string | null
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_note_hides: {
        Row: {
          created_at: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_note_hides_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "shared_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_note_hides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_note_likes: {
        Row: {
          created_at: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_note_likes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "shared_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_note_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_notes: {
        Row: {
          author_id: string | null
          body: string
          conversation_id: string | null
          created_at: string
          edited_at: string | null
          id: string
          like_count: number
          referenced_task_entry_id: string | null
          source_questions: string | null
          team_id: string
          title: string
          updated_at: string
          xp_awarded_likes: number
        }
        Insert: {
          author_id?: string | null
          body: string
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          like_count?: number
          referenced_task_entry_id?: string | null
          source_questions?: string | null
          team_id: string
          title: string
          updated_at?: string
          xp_awarded_likes?: number
        }
        Update: {
          author_id?: string | null
          body?: string
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          like_count?: number
          referenced_task_entry_id?: string | null
          source_questions?: string | null
          team_id?: string
          title?: string
          updated_at?: string
          xp_awarded_likes?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_notes_referenced_task_entry_id_fkey"
            columns: ["referenced_task_entry_id"]
            isOneToOne: false
            referencedRelation: "task_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      task_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          raw_text: string
          summary: string
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          raw_text: string
          summary: string
          team_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          raw_text?: string
          summary?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed_at: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          title: string
          user_id: string
          xp_awarded_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title: string
          user_id: string
          xp_awarded_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title?: string
          user_id?: string
          xp_awarded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: { Args: { p_amount: number; p_user_id: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      my_team_id: { Args: never; Returns: string }
      question_trend: {
        Args: { p_user_id: string }
        Returns: {
          count: number
          referenced_task_entry_id: string
        }[]
      }
      toggle_shared_note_like: { Args: { p_note_id: string }; Returns: boolean }
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

