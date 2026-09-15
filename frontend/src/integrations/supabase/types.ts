export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
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
            foreignKeyName: "media_retention_queue_attachment_id_fkey";
            columns: ["attachment_id"];
            isOneToOne: false;
            referencedRelation: "assistant_attachments";
            referencedColumns: ["id"];
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
      begin_emergency_storage_cleanup: {
        Args: never;
        Returns: {
          quota_bytes: number;
          run_token: string;
          target_delete_bytes: number;
          used_bytes: number;
        }[];
      };
      finish_emergency_storage_cleanup: {
        Args: { p_freed_bytes: number; p_run_token: string };
        Returns: undefined;
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

export type StorageUsageStatus =
  Database["public"]["Functions"]["get_storage_usage_status"]["Returns"][number];
