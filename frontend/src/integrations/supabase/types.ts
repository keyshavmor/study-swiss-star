/**
 * Supabase schema types for the production project.
 *
 * Hand-maintained to match the live schema: tutoring `threads`/`messages`,
 * `profiles`, `user_preferences`, `documents`/`document_chunks`, and the
 * separate general-assistant tables (`assistant_threads`,
 * `assistant_messages`, `assistant_attachments`).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type StorageUsageStatus = {
  quota_bytes: number;
  used_bytes: number;
  remaining_bytes: number;
  used_percent: number;
  remaining_percent: number;
  warning_threshold_reached: boolean;
  emergency_cleanup_needed: boolean;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          category: string | null;
          message: string;
          context: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category?: string | null;
          message: string;
          context?: Json | null;
          created_at?: string | null;
        };
        Update: {
          category?: string | null;
          message?: string;
          context?: Json | null;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          feature: string | null;
          subject: string | null;
          properties: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          feature?: string | null;
          subject?: string | null;
          properties?: Json | null;
          created_at?: string | null;
        };
        Update: {
          event_name?: string;
          feature?: string | null;
          subject?: string | null;
          properties?: Json | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          preferred_name: string | null;
          photo: string | null;
          nationality: string | null;
          contact_phone: string | null;
          contact_details: Json | null;
          created_at: string | null;
          updated_at: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          preferred_name?: string | null;
          photo?: string | null;
          nationality?: string | null;
          contact_phone?: string | null;
          contact_details?: Json | null;
        };
        Update: {
          username?: string | null;
          full_name?: string | null;
          preferred_name?: string | null;
          photo?: string | null;
          nationality?: string | null;
          contact_phone?: string | null;
          contact_details?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferences: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferences?: Json | null;
        };
        Update: {
          preferences?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          user_id: string;
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          user_id: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          document_id: string;
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      assistant_threads: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
        };
        Update: {
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assistant_messages: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          role: string;
          content: string;
          parts: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          role: string;
          content: string;
          parts?: Json | null;
          metadata?: Json | null;
        };
        Update: {
          content?: string;
          parts?: Json | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      assistant_attachments: {
        Row: {
          id: string;
          user_id: string;
          thread_id: string | null;
          message_id: string | null;
          storage_bucket: string;
          object_path: string;
          file_name: string;
          mime_type: string | null;
          byte_size: number | null;
          kind: string | null;
          parse_status: string | null;
          metadata: Json | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          thread_id?: string | null;
          message_id?: string | null;
          storage_bucket: string;
          object_path: string;
          file_name: string;
          mime_type?: string | null;
          byte_size?: number | null;
          kind?: string | null;
          parse_status?: string | null;
          metadata?: Json | null;
        };
        Update: {
          message_id?: string | null;
          parse_status?: string | null;
          metadata?: Json | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          parts: Json | null;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          parts?: Json | null;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          parts?: Json | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_thread_owner_fkey";
            columns: ["thread_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      threads: {
        Row: {
          created_at: string;
          id: string;
          subject: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          subject?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          subject?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_storage_usage_status: {
        Args: Record<string, never>;
        Returns: StorageUsageStatus[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
