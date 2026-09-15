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

/**
 * CURRENT SUPABASE: return shape of `public.get_ai_runtime_policy()`.
 * Percent values are whole numbers (50 means "50% free").
 */
export type AiRuntimePolicyRow = {
  preflight_gpu_free_percent: number;
  preflight_ram_free_percent: number;
  preflight_storage_free_percent: number;
  ready_gpu_free_percent: number;
  ready_ram_free_percent: number;
  ready_storage_free_percent: number;
  check_active_users: boolean;
  deduplicate_model_downloads: boolean;
  allow_parallel_per_user_model_processes: boolean;
};

/** CURRENT SUPABASE: `public.account_compliance.account_type`. */
export type AccountType = "unknown" | "student" | "teacher";

/** CURRENT SUPABASE: `public.account_compliance.account_status`. */
export type AccountStatus = "active" | "suspended_pending_review" | "deletion_pending";

/**
 * CURRENT SUPABASE (verified 2026-09-15): `user_legal_consents.document_type`.
 * The column is `document_type` — there is no `document_kind`.
 */
export type LegalDocumentType = "terms" | "privacy" | "acceptable_use" | "safety_notice";

/**
 * CURRENT SUPABASE (verified 2026-09-15): one row returned by
 * `public.get_or_create_direct_peer_conversation(p_username)`.
 */
export type DirectPeerConversationRow = {
  conversation_id: string;
  peer_user_id: string;
  peer_username: string;
  peer_preferred_name: string | null;
};

/**
 * CURRENT SUPABASE: return shape of `public.get_system_admission_policy()`.
 * Policy/config ONLY — the actual measurements and active-user count remain
 * EXPECTED LOCAL BACKEND authority.
 */
export type SystemAdmissionPolicyRow = {
  max_active_users: number;
  login_gpu_free_percent: number;
  login_ram_free_percent: number;
  login_storage_free_percent: number;
  max_gpu_used_percent: number;
  max_ram_used_percent: number;
  max_storage_used_percent: number;
  automatic_model_rebalancing: boolean;
  preserve_inflight_requests: boolean;
  queue_new_allocations_while_rebalancing: boolean;
  recommend_model_from_system_health: boolean;
};

/**
 * CURRENT SUPABASE (verified 2026-09-15): `public.get_user_visible_supabase_health()`
 * returns ONE JSON object with nested groups. A group or key that production
 * does not expose is absent/null — it must be rendered as "Not exposed" and
 * never silently coerced to 0.
 */
export type SupabaseHealthStorageGroup = {
  used_bytes?: number | null;
  quota_bytes?: number | null;
  remaining_bytes?: number | null;
  used_percent?: number | null;
  cleanup_trigger_used_percent?: number | null;
  cleanup_target_used_percent?: number | null;
};

export type SupabaseHealthDatabaseGroup = {
  used_bytes?: number | null;
  quota_bytes?: number | null;
  used_percent?: number | null;
};

export type SupabaseHealthBandwidthGroup = {
  used_bytes?: number | null;
  quota_bytes?: number | null;
  used_percent?: number | null;
  status?: string | null;
};

export type SupabaseHealthUsageGroup = {
  usage?: number | null;
  quota?: number | null;
  status?: string | null;
};

export type SupabaseHealthJson = {
  object_storage?: SupabaseHealthStorageGroup | null;
  database?: SupabaseHealthDatabaseGroup | null;
  bandwidth?: SupabaseHealthBandwidthGroup | null;
  realtime?: SupabaseHealthUsageGroup | null;
  edge_functions?: SupabaseHealthUsageGroup | null;
};

/**
 * CURRENT SUPABASE (verified 2026-09-15): `public.get_my_data_summary()` returns
 * ONE JSON object with these exact count/byte keys for the caller only.
 */
export type MyDataSummaryJson = {
  peer_messages?: number | null;
  peer_attachments?: number | null;
  peer_attachment_bytes?: number | null;
  assistant_messages?: number | null;
  assistant_attachments?: number | null;
  assistant_attachment_bytes?: number | null;
  study_chat_messages?: number | null;
  documents?: number | null;
  document_bytes?: number | null;
  planner_events?: number | null;
  feedback_items?: number | null;
};

/**
 * CURRENT SUPABASE: return shape of `public.find_peer_by_exact_username()`.
 * Data minimisation: no email, date of birth or guardian details are exposed.
 */
export type PeerDirectoryRow = {
  user_id: string;
  username: string;
  preferred_name: string | null;
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
          user_id: string;
          category: string;
          message: string;
          context: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          message: string;
          context: Json;
          created_at?: string;
        };
        Update: {
          category?: string;
          message?: string;
          context?: Json;
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
          properties: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          feature?: string | null;
          subject?: string | null;
          properties?: Json;
          occurred_at?: string;
        };
        Update: {
          event_name?: string;
          feature?: string | null;
          subject?: string | null;
          properties?: Json;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          username: string;
          full_name: string;
          preferred_name: string;
          photo: string;
          nationality: string;
          contact_phone: string;
          contact_details: Json;
          date_of_birth: string | null;
          created_at: string;
          updated_at: string;
          [key: string]: Json | undefined;
        };
        Insert: {
          user_id: string;
          username?: string;
          full_name?: string;
          preferred_name?: string;
          photo?: string;
          nationality?: string;
          contact_phone?: string;
          contact_details?: Json;
          date_of_birth?: string | null;
        };
        Update: {
          username?: string;
          full_name?: string;
          preferred_name?: string;
          photo?: string;
          nationality?: string;
          contact_phone?: string;
          contact_details?: Json;
          date_of_birth?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_preferences: {
        Row: {
          user_id: string;
          academic_year: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          academic_year?: string | null;
          preferences?: Json;
        };
        Update: {
          academic_year?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      /**
       * Assistant OUTPUT media retention queue. Originals become eligible for
       * deletion 30 minutes after creation; the textual descriptor in
       * `assistant-descriptors` is the retrieval surface afterwards.
       */
      media_retention_queue: {
        Row: {
          id: string;
          user_id: string;
          attachment_id: string | null;
          media_kind: string;
          storage_bucket: string;
          object_path: string;
          descriptor_bucket: string;
          descriptor_path: string | null;
          source_url: string | null;
          source_path: string | null;
          status: string;
          created_at: string;
          delete_after: string;
          deleted_at: string | null;
          error_code: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          attachment_id?: string | null;
          media_kind: string;
          storage_bucket: string;
          object_path: string;
          descriptor_bucket?: string;
          descriptor_path?: string | null;
          source_url?: string | null;
          source_path?: string | null;
          status?: string;
          created_at?: string;
          delete_after?: string;
          deleted_at?: string | null;
          error_code?: string | null;
        };
        Update: {
          attachment_id?: string | null;
          media_kind?: string;
          storage_bucket?: string;
          object_path?: string;
          descriptor_bucket?: string;
          descriptor_path?: string | null;
          source_url?: string | null;
          source_path?: string | null;
          status?: string;
          delete_after?: string;
          deleted_at?: string | null;
          error_code?: string | null;
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
      /**
       * CURRENT SUPABASE: read-only catalog of selectable local models.
       * Authenticated users may SELECT; nobody writes from the frontend.
       */
      ai_model_catalog: {
        Row: {
          model_id: string;
          display_name: string;
          enabled: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          model_id: string;
          display_name: string;
          enabled?: boolean;
          sort_order?: number;
        };
        Update: {
          display_name?: string;
          enabled?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      /**
       * CURRENT SUPABASE: per-user compliance/safety state. The user may SELECT
       * their own row; there is no client write path (the RPC owns writes).
       */
      account_compliance: {
        Row: {
          user_id: string;
          account_type: AccountType;
          date_of_birth: string | null;
          guardian_email: string | null;
          guardian_contact_verified_at: string | null;
          compliance_onboarding_completed: boolean;
          safety_intro_acknowledged_at: string | null;
          account_status: AccountStatus;
          safety_strike_count: number;
          suspended_at: string | null;
          suspension_reason_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** CURRENT SUPABASE: versioned consent records; own-row SELECT only. */
      user_legal_consents: {
        Row: {
          id: string;
          user_id: string;
          document_type: LegalDocumentType;
          document_version: string;
          accepted_at: string;
          withdrawn_at: string | null;
          consent_source: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * CURRENT SUPABASE: bounded safety audit metadata. NEVER stores raw
       * offending content — only category/reason codes and a content hash.
       */
      moderation_events: {
        Row: {
          id: string;
          user_id: string;
          surface: string;
          verdict: string;
          category_code: string | null;
          reason_code: string | null;
          content_hash: string | null;
          strike_number: number | null;
          review_status: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** CURRENT SUPABASE: admin-only guardian notification review queue. */
      guardian_notification_queue: {
        Row: {
          id: string;
          user_id: string;
          guardian_email: string | null;
          reason_code: string | null;
          review_status: string;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * CURRENT SUPABASE (verified 2026-09-15): there is no `kind` and no
       * `last_message_at`; ordering uses `updated_at`.
       */
      peer_conversations: {
        Row: {
          id: string;
          conversation_type: string;
          /** CURRENT SUPABASE (verified 2026-09-15): nullable. */
          created_by: string | null;
          direct_key: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      peer_conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          member_role: string;
          joined_at: string;
          last_read_at: string | null;
          muted: boolean;
          left_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "peer_conversation_members_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "peer_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      /**
       * CURRENT SUPABASE: readable by conversation members. Direct client
       * INSERT/UPDATE is intentionally disabled until the future local safety
       * backend returns an allow verdict — do not work around this.
       */
      peer_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_user_id: string;
          body: string;
          moderation_status: string;
          moderation_event_id: string | null;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "peer_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "peer_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      peer_message_attachments: {
        Row: {
          id: string;
          message_id: string;
          conversation_id: string;
          owner_user_id: string;
          storage_bucket: string;
          object_path: string;
          file_name: string;
          mime_type: string;
          byte_size: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "peer_message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "peer_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      peer_message_notifications: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          message_id: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "peer_message_notifications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "peer_conversations";
            referencedColumns: ["id"];
          },
        ];
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
      get_ai_runtime_policy: {
        Args: Record<string, never>;
        Returns: AiRuntimePolicyRow[];
      };
      get_system_admission_policy: {
        Args: Record<string, never>;
        Returns: SystemAdmissionPolicyRow[];
      };
      /** Returns ONE JSON object (nested groups), not a flat row set. */
      get_user_visible_supabase_health: {
        Args: Record<string, never>;
        Returns: SupabaseHealthJson;
      };
      /** Returns ONE JSON object scoped to the caller. */
      get_my_data_summary: {
        Args: Record<string, never>;
        Returns: MyDataSummaryJson;
      };
      /** Returns JSONB describing the recorded compliance state. */
      complete_account_compliance_onboarding: {
        Args: {
          p_account_type: string;
          p_date_of_birth: string;
          p_guardian_email: string | null;
          p_terms_version: string;
          p_privacy_version: string;
          p_acceptable_use_version: string;
          p_safety_version: string;
        };
        Returns: Json;
      };
      find_peer_by_exact_username: {
        Args: { p_username: string };
        Returns: PeerDirectoryRow[];
      };
      /** Returns a ROW SET; read `conversation_id` from the first row. */
      get_or_create_direct_peer_conversation: {
        Args: { p_username: string };
        Returns: DirectPeerConversationRow[];
      };
      mark_peer_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: undefined;
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
