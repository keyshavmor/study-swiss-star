/**
 * Generated from the verified live Supabase project on 2026-09-20.
 *
 * The Database/utility sections below are generator output. Product-specific
 * response helpers remain above Database because JSON-returning RPCs cannot
 * express their nested shapes through the schema generator.
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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      account_compliance: {
        Row: {
          account_status: string;
          account_type: string;
          compliance_onboarding_completed: boolean;
          created_at: string;
          date_of_birth: string | null;
          guardian_contact_verified_at: string | null;
          guardian_email: string | null;
          safety_intro_acknowledged_at: string | null;
          safety_strike_count: number;
          suspended_at: string | null;
          suspension_reason_code: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_status?: string;
          account_type?: string;
          compliance_onboarding_completed?: boolean;
          created_at?: string;
          date_of_birth?: string | null;
          guardian_contact_verified_at?: string | null;
          guardian_email?: string | null;
          safety_intro_acknowledged_at?: string | null;
          safety_strike_count?: number;
          suspended_at?: string | null;
          suspension_reason_code?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_status?: string;
          account_type?: string;
          compliance_onboarding_completed?: boolean;
          created_at?: string;
          date_of_birth?: string | null;
          guardian_contact_verified_at?: string | null;
          guardian_email?: string | null;
          safety_intro_acknowledged_at?: string | null;
          safety_strike_count?: number;
          suspended_at?: string | null;
          suspension_reason_code?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_model_catalog: {
        Row: {
          created_at: string;
          display_name: string;
          enabled: boolean;
          model_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          enabled?: boolean;
          model_id: string;
          sort_order: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          enabled?: boolean;
          model_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          academic_year: string;
          assessment_date: string;
          assessment_type: string;
          created_at: string;
          id: string;
          imported_from: string | null;
          include_in_stats: boolean;
          max_points: number | null;
          notes: string;
          points: number | null;
          source: string;
          subject_slug: string;
          teacher_grade: number | null;
          title: string;
          topic: string;
          updated_at: string;
          user_id: string;
          weight: number;
        };
        Insert: {
          academic_year: string;
          assessment_date: string;
          assessment_type: string;
          created_at?: string;
          id?: string;
          imported_from?: string | null;
          include_in_stats?: boolean;
          max_points?: number | null;
          notes?: string;
          points?: number | null;
          source: string;
          subject_slug: string;
          teacher_grade?: number | null;
          title: string;
          topic?: string;
          updated_at?: string;
          user_id: string;
          weight?: number;
        };
        Update: {
          academic_year?: string;
          assessment_date?: string;
          assessment_type?: string;
          created_at?: string;
          id?: string;
          imported_from?: string | null;
          include_in_stats?: boolean;
          max_points?: number | null;
          notes?: string;
          points?: number | null;
          source?: string;
          subject_slug?: string;
          teacher_grade?: number | null;
          title?: string;
          topic?: string;
          updated_at?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [];
      };
      assistant_attachments: {
        Row: {
          byte_size: number;
          created_at: string;
          deleted_at: string | null;
          file_name: string;
          id: string;
          kind: string;
          message_id: string | null;
          metadata: Json;
          mime_type: string;
          object_path: string;
          parse_status: string;
          storage_bucket: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          deleted_at?: string | null;
          file_name: string;
          id?: string;
          kind: string;
          message_id?: string | null;
          metadata?: Json;
          mime_type: string;
          object_path: string;
          parse_status?: string;
          storage_bucket?: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          deleted_at?: string | null;
          file_name?: string;
          id?: string;
          kind?: string;
          message_id?: string | null;
          metadata?: Json;
          mime_type?: string;
          object_path?: string;
          parse_status?: string;
          storage_bucket?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_attachments_message_owner_fkey";
            columns: ["message_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "assistant_messages";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "assistant_attachments_thread_owner_fkey";
            columns: ["thread_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "assistant_threads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      assistant_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          parts: Json;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          parts?: Json;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          parts?: Json;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_owner_fkey";
            columns: ["thread_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "assistant_threads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      assistant_threads: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      context_artifacts: {
        Row: {
          artifact_type: string;
          content: string;
          content_location: string;
          created_at: string;
          id: string;
          metadata: Json;
          searchable: boolean;
          summary: string;
          title: string;
          token_count: number;
          user_id: string;
        };
        Insert: {
          artifact_type: string;
          content: string;
          content_location: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          searchable?: boolean;
          summary: string;
          title: string;
          token_count?: number;
          user_id: string;
        };
        Update: {
          artifact_type?: string;
          content?: string;
          content_location?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          searchable?: boolean;
          summary?: string;
          title?: string;
          token_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      conversation_summaries: {
        Row: {
          covered_message_ids: string[];
          created_at: string;
          id: string;
          summary: string;
          thread_id: string;
          token_count: number;
          user_id: string;
        };
        Insert: {
          covered_message_ids?: string[];
          created_at?: string;
          id?: string;
          summary: string;
          thread_id: string;
          token_count?: number;
          user_id: string;
        };
        Update: {
          covered_message_ids?: string[];
          created_at?: string;
          id?: string;
          summary?: string;
          thread_id?: string;
          token_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_thread_id_user_id_fkey";
            columns: ["thread_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          chapter: string | null;
          content: string;
          created_at: string;
          document_id: string;
          document_type: string | null;
          embedding: Json | null;
          id: string;
          language: string | null;
          metadata: Json;
          page: number | null;
          section: string | null;
          source: string | null;
          subject: string | null;
          subtopic: string | null;
          title: string;
          token_count: number;
          topic: string | null;
          user_id: string;
        };
        Insert: {
          chapter?: string | null;
          content: string;
          created_at?: string;
          document_id: string;
          document_type?: string | null;
          embedding?: Json | null;
          id?: string;
          language?: string | null;
          metadata?: Json;
          page?: number | null;
          section?: string | null;
          source?: string | null;
          subject?: string | null;
          subtopic?: string | null;
          title: string;
          token_count?: number;
          topic?: string | null;
          user_id: string;
        };
        Update: {
          chapter?: string | null;
          content?: string;
          created_at?: string;
          document_id?: string;
          document_type?: string | null;
          embedding?: Json | null;
          id?: string;
          language?: string | null;
          metadata?: Json;
          page?: number | null;
          section?: string | null;
          source?: string | null;
          subject?: string | null;
          subtopic?: string | null;
          title?: string;
          token_count?: number;
          topic?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_user_id_fkey";
            columns: ["document_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      documents: {
        Row: {
          archived: boolean;
          byte_size: number | null;
          created_at: string;
          document_type: string;
          id: string;
          language: string | null;
          metadata: Json;
          mime_type: string | null;
          notes: string;
          object_path: string | null;
          section: string | null;
          source: string | null;
          status: string;
          storage_bucket: string | null;
          subject_slug: string | null;
          title: string;
          topic: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived?: boolean;
          byte_size?: number | null;
          created_at?: string;
          document_type: string;
          id?: string;
          language?: string | null;
          metadata?: Json;
          mime_type?: string | null;
          notes?: string;
          object_path?: string | null;
          section?: string | null;
          source?: string | null;
          status?: string;
          storage_bucket?: string | null;
          subject_slug?: string | null;
          title: string;
          topic?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived?: boolean;
          byte_size?: number | null;
          created_at?: string;
          document_type?: string;
          id?: string;
          language?: string | null;
          metadata?: Json;
          mime_type?: string | null;
          notes?: string;
          object_path?: string | null;
          section?: string | null;
          source?: string | null;
          status?: string;
          storage_bucket?: string | null;
          subject_slug?: string | null;
          title?: string;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          category: string;
          context: Json;
          created_at: string;
          id: string;
          message: string;
          user_id: string;
        };
        Insert: {
          category: string;
          context?: Json;
          created_at?: string;
          id?: string;
          message: string;
          user_id: string;
        };
        Update: {
          category?: string;
          context?: Json;
          created_at?: string;
          id?: string;
          message?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      grading_results: {
        Row: {
          academic_year: string | null;
          component: string | null;
          feedback: Json;
          graded_at: string;
          id: string;
          max_points: number | null;
          metadata: Json;
          model_used: string | null;
          points: number | null;
          source_id: string | null;
          source_type: string;
          subject: string;
          swiss_grade: number | null;
          user_answers: Json;
          user_id: string;
        };
        Insert: {
          academic_year?: string | null;
          component?: string | null;
          feedback?: Json;
          graded_at?: string;
          id?: string;
          max_points?: number | null;
          metadata?: Json;
          model_used?: string | null;
          points?: number | null;
          source_id?: string | null;
          source_type: string;
          subject: string;
          swiss_grade?: number | null;
          user_answers?: Json;
          user_id: string;
        };
        Update: {
          academic_year?: string | null;
          component?: string | null;
          feedback?: Json;
          graded_at?: string;
          id?: string;
          max_points?: number | null;
          metadata?: Json;
          model_used?: string | null;
          points?: number | null;
          source_id?: string | null;
          source_type?: string;
          subject?: string;
          swiss_grade?: number | null;
          user_answers?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      guardian_notification_queue: {
        Row: {
          created_at: string;
          id: string;
          moderation_event_id: string | null;
          reviewed_at: string | null;
          sent_at: string | null;
          status: string;
          student_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          moderation_event_id?: string | null;
          reviewed_at?: string | null;
          sent_at?: string | null;
          status?: string;
          student_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          moderation_event_id?: string | null;
          reviewed_at?: string | null;
          sent_at?: string | null;
          status?: string;
          student_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guardian_notification_queue_moderation_event_id_fkey";
            columns: ["moderation_event_id"];
            isOneToOne: true;
            referencedRelation: "moderation_events";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_events: {
        Row: {
          content: string;
          created_at: string;
          event_type: string;
          id: string;
          importance: number;
          metadata: Json;
          occurred_at: string;
          subject: string | null;
          topic: string | null;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          event_type: string;
          id?: string;
          importance?: number;
          metadata?: Json;
          occurred_at?: string;
          subject?: string | null;
          topic?: string | null;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          importance?: number;
          metadata?: Json;
          occurred_at?: string;
          subject?: string | null;
          topic?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      media_retention_queue: {
        Row: {
          attachment_id: string | null;
          created_at: string;
          delete_after: string;
          deleted_at: string | null;
          descriptor_bucket: string;
          descriptor_path: string;
          error_code: string | null;
          id: string;
          media_kind: string;
          object_path: string;
          source_path: string | null;
          source_url: string | null;
          status: string;
          storage_bucket: string;
          user_id: string;
        };
        Insert: {
          attachment_id?: string | null;
          created_at?: string;
          delete_after?: string;
          deleted_at?: string | null;
          descriptor_bucket?: string;
          descriptor_path: string;
          error_code?: string | null;
          id?: string;
          media_kind: string;
          object_path: string;
          source_path?: string | null;
          source_url?: string | null;
          status?: string;
          storage_bucket: string;
          user_id: string;
        };
        Update: {
          attachment_id?: string | null;
          created_at?: string;
          delete_after?: string;
          deleted_at?: string | null;
          descriptor_bucket?: string;
          descriptor_path?: string;
          error_code?: string | null;
          id?: string;
          media_kind?: string;
          object_path?: string;
          source_path?: string | null;
          source_url?: string | null;
          status?: string;
          storage_bucket?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_retention_queue_attachment_owner_fkey";
            columns: ["attachment_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "assistant_attachments";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          parts: Json | null;
          role: string;
          thread_id: string;
          token_count: number;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          parts?: Json | null;
          role: string;
          thread_id: string;
          token_count?: number;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          parts?: Json | null;
          role?: string;
          thread_id?: string;
          token_count?: number;
          user_id?: string;
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
      mock_exam_attempts: {
        Row: {
          answers: Json;
          attempt_number: number;
          completed_at: string | null;
          grading_feedback: Json;
          id: string;
          max_points: number | null;
          mock_exam_id: string;
          points: number | null;
          score: number | null;
          started_at: string;
          swiss_grade: number | null;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          attempt_number?: number;
          completed_at?: string | null;
          grading_feedback?: Json;
          id?: string;
          max_points?: number | null;
          mock_exam_id: string;
          points?: number | null;
          score?: number | null;
          started_at?: string;
          swiss_grade?: number | null;
          user_id: string;
        };
        Update: {
          answers?: Json;
          attempt_number?: number;
          completed_at?: string | null;
          grading_feedback?: Json;
          id?: string;
          max_points?: number | null;
          mock_exam_id?: string;
          points?: number | null;
          score?: number | null;
          started_at?: string;
          swiss_grade?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mock_exam_attempts_mock_exam_id_user_id_fkey";
            columns: ["mock_exam_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "mock_exams";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      mock_exams: {
        Row: {
          academic_year: string | null;
          component: string | null;
          duration_minutes: number | null;
          generated_at: string;
          id: string;
          metadata: Json;
          model_used: string | null;
          questions: Json;
          source_document_ids: string[];
          subject: string;
          topic: string | null;
          user_id: string;
        };
        Insert: {
          academic_year?: string | null;
          component?: string | null;
          duration_minutes?: number | null;
          generated_at?: string;
          id?: string;
          metadata?: Json;
          model_used?: string | null;
          questions: Json;
          source_document_ids?: string[];
          subject: string;
          topic?: string | null;
          user_id: string;
        };
        Update: {
          academic_year?: string | null;
          component?: string | null;
          duration_minutes?: number | null;
          generated_at?: string;
          id?: string;
          metadata?: Json;
          model_used?: string | null;
          questions?: Json;
          source_document_ids?: string[];
          subject?: string;
          topic?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      moderation_events: {
        Row: {
          category: string;
          content_hash: string | null;
          created_at: string;
          decision: string;
          id: string;
          occurred_at: string;
          reason_code: string;
          review_status: string;
          reviewed_at: string | null;
          source_type: string;
          strike_number: number | null;
          user_id: string | null;
        };
        Insert: {
          category: string;
          content_hash?: string | null;
          created_at?: string;
          decision?: string;
          id?: string;
          occurred_at?: string;
          reason_code: string;
          review_status?: string;
          reviewed_at?: string | null;
          source_type: string;
          strike_number?: number | null;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          content_hash?: string | null;
          created_at?: string;
          decision?: string;
          id?: string;
          occurred_at?: string;
          reason_code?: string;
          review_status?: string;
          reviewed_at?: string | null;
          source_type?: string;
          strike_number?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notification_state: {
        Row: {
          dismissed_at: string | null;
          notification_key: string;
          read_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          dismissed_at?: string | null;
          notification_key: string;
          read_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          dismissed_at?: string | null;
          notification_key?: string;
          read_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      peer_conversation_members: {
        Row: {
          conversation_id: string;
          joined_at: string;
          last_read_at: string | null;
          left_at: string | null;
          member_role: string;
          muted: boolean;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          left_at?: string | null;
          member_role?: string;
          muted?: boolean;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          left_at?: string | null;
          member_role?: string;
          muted?: boolean;
          user_id?: string;
        };
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
      peer_conversations: {
        Row: {
          conversation_type: string;
          created_at: string;
          created_by: string | null;
          direct_key: string | null;
          id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          conversation_type?: string;
          created_at?: string;
          created_by?: string | null;
          direct_key?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          conversation_type?: string;
          created_at?: string;
          created_by?: string | null;
          direct_key?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      peer_message_attachments: {
        Row: {
          byte_size: number;
          conversation_id: string;
          created_at: string;
          file_name: string;
          id: string;
          message_id: string;
          mime_type: string;
          object_path: string;
          owner_user_id: string;
          storage_bucket: string;
        };
        Insert: {
          byte_size: number;
          conversation_id: string;
          created_at?: string;
          file_name: string;
          id?: string;
          message_id: string;
          mime_type: string;
          object_path: string;
          owner_user_id: string;
          storage_bucket?: string;
        };
        Update: {
          byte_size?: number;
          conversation_id?: string;
          created_at?: string;
          file_name?: string;
          id?: string;
          message_id?: string;
          mime_type?: string;
          object_path?: string;
          owner_user_id?: string;
          storage_bucket?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peer_message_attachments_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "peer_conversations";
            referencedColumns: ["id"];
          },
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
          conversation_id: string;
          created_at: string;
          id: string;
          message_id: string;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          id?: string;
          message_id: string;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          id?: string;
          message_id?: string;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peer_message_notifications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "peer_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "peer_message_notifications_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "peer_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      peer_messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          moderation_event_id: string | null;
          moderation_status: string;
          sender_user_id: string;
        };
        Insert: {
          body?: string;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          moderation_event_id?: string | null;
          moderation_status?: string;
          sender_user_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          moderation_event_id?: string | null;
          moderation_status?: string;
          sender_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peer_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "peer_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "peer_messages_moderation_event_id_fkey";
            columns: ["moderation_event_id"];
            isOneToOne: false;
            referencedRelation: "moderation_events";
            referencedColumns: ["id"];
          },
        ];
      };
      planner_events: {
        Row: {
          category: string;
          color: string | null;
          created_at: string;
          done: boolean;
          end_time: string;
          event_date: string;
          exceptions: string[];
          generated: boolean;
          id: string;
          location: string | null;
          notes: string | null;
          overrides: Json;
          recurrence: string;
          reminder: string | null;
          start_time: string;
          subject_slug: string | null;
          title: string;
          travel_after: number | null;
          travel_before: number | null;
          travel_minutes: number | null;
          until_date: string | null;
          updated_at: string;
          user_id: string;
          weekdays: number[];
        };
        Insert: {
          category: string;
          color?: string | null;
          created_at?: string;
          done?: boolean;
          end_time: string;
          event_date: string;
          exceptions?: string[];
          generated?: boolean;
          id?: string;
          location?: string | null;
          notes?: string | null;
          overrides?: Json;
          recurrence?: string;
          reminder?: string | null;
          start_time: string;
          subject_slug?: string | null;
          title: string;
          travel_after?: number | null;
          travel_before?: number | null;
          travel_minutes?: number | null;
          until_date?: string | null;
          updated_at?: string;
          user_id: string;
          weekdays?: number[];
        };
        Update: {
          category?: string;
          color?: string | null;
          created_at?: string;
          done?: boolean;
          end_time?: string;
          event_date?: string;
          exceptions?: string[];
          generated?: boolean;
          id?: string;
          location?: string | null;
          notes?: string | null;
          overrides?: Json;
          recurrence?: string;
          reminder?: string | null;
          start_time?: string;
          subject_slug?: string | null;
          title?: string;
          travel_after?: number | null;
          travel_before?: number | null;
          travel_minutes?: number | null;
          until_date?: string | null;
          updated_at?: string;
          user_id?: string;
          weekdays?: number[];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          class_name: string;
          class_teacher: string;
          contact_details: Json;
          contact_phone: string;
          created_at: string;
          date_of_birth: string | null;
          focus_subject: string;
          full_name: string;
          language: string;
          nationality: string;
          photo: string;
          preferred_name: string;
          school_email: string;
          school_name: string;
          school_type: string;
          student_number: string;
          updated_at: string;
          user_id: string;
          username: string;
        };
        Insert: {
          class_name?: string;
          class_teacher?: string;
          contact_details?: Json;
          contact_phone?: string;
          created_at?: string;
          date_of_birth?: string | null;
          focus_subject?: string;
          full_name?: string;
          language?: string;
          nationality?: string;
          photo?: string;
          preferred_name?: string;
          school_email?: string;
          school_name?: string;
          school_type?: string;
          student_number?: string;
          updated_at?: string;
          user_id: string;
          username?: string;
        };
        Update: {
          class_name?: string;
          class_teacher?: string;
          contact_details?: Json;
          contact_phone?: string;
          created_at?: string;
          date_of_birth?: string | null;
          focus_subject?: string;
          full_name?: string;
          language?: string;
          nationality?: string;
          photo?: string;
          preferred_name?: string;
          school_email?: string;
          school_name?: string;
          school_type?: string;
          student_number?: string;
          updated_at?: string;
          user_id?: string;
          username?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          attempt_number: number;
          completed_at: string | null;
          grading_feedback: Json;
          id: string;
          max_points: number | null;
          points: number | null;
          quiz_id: string;
          score: number | null;
          started_at: string;
          swiss_grade: number | null;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          attempt_number?: number;
          completed_at?: string | null;
          grading_feedback?: Json;
          id?: string;
          max_points?: number | null;
          points?: number | null;
          quiz_id: string;
          score?: number | null;
          started_at?: string;
          swiss_grade?: number | null;
          user_id: string;
        };
        Update: {
          answers?: Json;
          attempt_number?: number;
          completed_at?: string | null;
          grading_feedback?: Json;
          id?: string;
          max_points?: number | null;
          points?: number | null;
          quiz_id?: string;
          score?: number | null;
          started_at?: string;
          swiss_grade?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_user_id_fkey";
            columns: ["quiz_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      quizzes: {
        Row: {
          academic_year: string | null;
          component: string | null;
          generated_at: string;
          id: string;
          metadata: Json;
          model_used: string | null;
          questions: Json;
          source_document_ids: string[];
          subject: string;
          topic: string | null;
          user_id: string;
        };
        Insert: {
          academic_year?: string | null;
          component?: string | null;
          generated_at?: string;
          id?: string;
          metadata?: Json;
          model_used?: string | null;
          questions: Json;
          source_document_ids?: string[];
          subject: string;
          topic?: string | null;
          user_id: string;
        };
        Update: {
          academic_year?: string | null;
          component?: string | null;
          generated_at?: string;
          id?: string;
          metadata?: Json;
          model_used?: string | null;
          questions?: Json;
          source_document_ids?: string[];
          subject?: string;
          topic?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      school_links: {
        Row: {
          accent: string;
          added_on: string;
          category: string;
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          open_count: number;
          sort_order: number;
          subject_slug: string | null;
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          accent: string;
          added_on?: string;
          category: string;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          open_count?: number;
          sort_order?: number;
          subject_slug?: string | null;
          updated_at?: string;
          url: string;
          user_id: string;
        };
        Update: {
          accent?: string;
          added_on?: string;
          category?: string;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          open_count?: number;
          sort_order?: number;
          subject_slug?: string | null;
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      student_memories: {
        Row: {
          confidence: number;
          content: string;
          created_at: string;
          evidence: Json;
          evidence_count: number;
          id: string;
          importance: number;
          last_accessed_at: string | null;
          memory_type: string;
          metadata: Json;
          subject: string | null;
          topic: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: number;
          content: string;
          created_at?: string;
          evidence?: Json;
          evidence_count?: number;
          id?: string;
          importance?: number;
          last_accessed_at?: string | null;
          memory_type: string;
          metadata?: Json;
          subject?: string | null;
          topic?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: number;
          content?: string;
          created_at?: string;
          evidence?: Json;
          evidence_count?: number;
          id?: string;
          importance?: number;
          last_accessed_at?: string | null;
          memory_type?: string;
          metadata?: Json;
          subject?: string | null;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_plans: {
        Row: {
          academic_year: string | null;
          completed_at: string | null;
          generated_at: string;
          id: string;
          learning_goal_id: string | null;
          metadata: Json;
          model_used: string | null;
          plan: Json;
          status: string;
          subject: string | null;
          title: string;
          topic: string | null;
          user_id: string;
        };
        Insert: {
          academic_year?: string | null;
          completed_at?: string | null;
          generated_at?: string;
          id?: string;
          learning_goal_id?: string | null;
          metadata?: Json;
          model_used?: string | null;
          plan: Json;
          status?: string;
          subject?: string | null;
          title: string;
          topic?: string | null;
          user_id: string;
        };
        Update: {
          academic_year?: string | null;
          completed_at?: string | null;
          generated_at?: string;
          id?: string;
          learning_goal_id?: string | null;
          metadata?: Json;
          model_used?: string | null;
          plan?: Json;
          status?: string;
          subject?: string | null;
          title?: string;
          topic?: string | null;
          user_id?: string;
        };
        Relationships: [];
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
          created_at?: string;
          id?: string;
          subject?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          event_name: string;
          feature: string | null;
          id: string;
          occurred_at: string;
          properties: Json;
          subject: string | null;
          user_id: string | null;
        };
        Insert: {
          event_name: string;
          feature?: string | null;
          id?: string;
          occurred_at?: string;
          properties?: Json;
          subject?: string | null;
          user_id?: string | null;
        };
        Update: {
          event_name?: string;
          feature?: string | null;
          id?: string;
          occurred_at?: string;
          properties?: Json;
          subject?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_legal_consents: {
        Row: {
          accepted_at: string;
          consent_source: string;
          created_at: string;
          document_type: string;
          document_version: string;
          id: string;
          user_id: string;
          withdrawn_at: string | null;
        };
        Insert: {
          accepted_at?: string;
          consent_source?: string;
          created_at?: string;
          document_type: string;
          document_version: string;
          id?: string;
          user_id: string;
          withdrawn_at?: string | null;
        };
        Update: {
          accepted_at?: string;
          consent_source?: string;
          created_at?: string;
          document_type?: string;
          document_version?: string;
          id?: string;
          user_id?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          academic_year: string | null;
          created_at: string;
          preferences: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          academic_year?: string | null;
          created_at?: string;
          preferences?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          academic_year?: string | null;
          created_at?: string;
          preferences?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      working_memory: {
        Row: {
          content: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          metadata: Json;
          task_id: string | null;
          thread_id: string | null;
          token_count: number;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          task_id?: string | null;
          thread_id?: string | null;
          token_count?: number;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          task_id?: string | null;
          thread_id?: string | null;
          token_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "working_memory_thread_id_user_id_fkey";
            columns: ["thread_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_confirmed_safety_strike: {
        Args: {
          p_category: string;
          p_content_hash?: string;
          p_reason_code: string;
          p_source_type: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      begin_emergency_storage_cleanup: {
        Args: never;
        Returns: {
          quota_bytes: number;
          run_token: string;
          target_delete_bytes: number;
          used_bytes: number;
        }[];
      };
      can_allocate_my_quota: {
        Args: { p_additional_bytes?: number };
        Returns: boolean;
      };
      complete_account_compliance_onboarding: {
        Args: {
          p_acceptable_use_version: string;
          p_account_type: string;
          p_date_of_birth: string;
          p_guardian_email: string;
          p_privacy_version: string;
          p_safety_version: string;
          p_terms_version: string;
        };
        Returns: Json;
      };
      find_peer_by_exact_username: {
        Args: { p_username: string };
        Returns: {
          preferred_name: string;
          user_id: string;
          username: string;
        }[];
      };
      finish_emergency_storage_cleanup: {
        Args: { p_freed_bytes: number; p_run_token: string };
        Returns: undefined;
      };
      get_ai_runtime_policy: {
        Args: never;
        Returns: {
          allow_parallel_per_user_model_processes: boolean;
          check_active_users: boolean;
          deduplicate_model_downloads: boolean;
          preflight_gpu_free_percent: number;
          preflight_ram_free_percent: number;
          preflight_storage_free_percent: number;
          ready_gpu_free_percent: number;
          ready_ram_free_percent: number;
          ready_storage_free_percent: number;
        }[];
      };
      get_emergency_cleanup_candidates: {
        Args: { p_target_bytes: number };
        Returns: {
          bucket_id: string;
          created_at: string;
          object_path: string;
          size_bytes: number;
        }[];
      };
      get_my_data_summary: { Args: never; Returns: Json };
      get_my_quota_status: { Args: never; Returns: Json };
      get_or_create_direct_peer_conversation: {
        Args: { p_username: string };
        Returns: {
          conversation_id: string;
          peer_preferred_name: string;
          peer_user_id: string;
          peer_username: string;
        }[];
      };
      get_storage_usage_status: {
        Args: never;
        Returns: {
          cleanup_delete_percent: number;
          cleanup_remaining_percent: number;
          emergency_cleanup_needed: boolean;
          quota_bytes: number;
          remaining_bytes: number;
          remaining_percent: number;
          used_bytes: number;
          used_percent: number;
          warning: boolean;
          warning_remaining_percent: number;
        }[];
      };
      get_system_admission_policy: {
        Args: never;
        Returns: {
          automatic_model_rebalancing: boolean;
          login_gpu_free_percent: number;
          login_ram_free_percent: number;
          login_storage_free_percent: number;
          max_active_users: number;
          max_gpu_used_percent: number;
          max_ram_used_percent: number;
          max_storage_used_percent: number;
          preserve_inflight_requests: boolean;
          queue_new_allocations_while_rebalancing: boolean;
          recommend_model_from_system_health: boolean;
        }[];
      };
      get_user_visible_supabase_health: { Args: never; Returns: Json };
      mark_peer_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      service_delete_all_user_content: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      service_delete_user_range: {
        Args: {
          p_delete_ai_messages?: boolean;
          p_delete_peer_messages?: boolean;
          p_end: string;
          p_start: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      verify_storage_capacity_cleanup_secret: {
        Args: { p_secret: string };
        Returns: boolean;
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
