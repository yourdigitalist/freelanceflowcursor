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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          avatar_color: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string | null
          street: string | null
          street2: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_color?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          street2?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_color?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          street2?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_description: string | null
          quantity: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_description?: string | null
          quantity?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_description?: string | null
          quantity?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bank_details: string | null
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_footer: string | null
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_date: string | null
          project_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details?: string | null
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details?: string | null
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_routing_number: string | null
          business_address: string | null
          business_city: string | null
          business_country: string | null
          business_email: string | null
          business_logo: string | null
          business_name: string | null
          business_phone: string | null
          business_postal_code: string | null
          business_state: string | null
          business_street: string | null
          business_street2: string | null
          business_website: string | null
          company_name: string | null
          created_at: string
          currency: string | null
          currency_display: string | null
          number_format: string | null
          date_format: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          last_name: string | null
          invoice_email_message_default: string | null
          invoice_email_subject_default: string | null
          invoice_footer: string | null
          invoice_notes_default: string | null
          invoice_prefix: string | null
          invoice_include_year: boolean | null
          invoice_number_start: number | null
          invoice_number_padding: number | null
          invoice_number_reset_yearly: boolean | null
          invoice_number_next: number | null
          invoice_number_last_year: number | null
          invoice_show_line_description: boolean | null
          invoice_show_quantity: boolean | null
          invoice_show_rate: boolean | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          reminder_body_default: string | null
          reminder_days_before: number | null
          reminder_enabled: boolean | null
          reminder_subject_default: string | null
          payment_instructions: string | null
          phone: string | null
          plan_type: string | null
          subscription_status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          is_admin: boolean | null
          tax_id: string | null
          time_format: string | null
          timezone: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_address?: string | null
          business_city?: string | null
          business_country?: string | null
          business_email?: string | null
          business_logo?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_postal_code?: string | null
          business_state?: string | null
          business_street?: string | null
          business_street2?: string | null
          business_website?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          currency_display?: string | null
          number_format?: string | null
          date_format?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          invoice_email_message_default?: string | null
          invoice_email_subject_default?: string | null
          invoice_footer?: string | null
          invoice_notes_default?: string | null
          invoice_prefix?: string | null
          invoice_include_year?: boolean | null
          invoice_number_start?: number | null
          invoice_number_padding?: number | null
          invoice_number_reset_yearly?: boolean | null
          invoice_number_next?: number | null
          invoice_number_last_year?: number | null
          invoice_show_line_description?: boolean | null
          invoice_show_quantity?: boolean | null
          invoice_show_rate?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          payment_instructions?: string | null
          phone?: string | null
          plan_type?: string | null
          reminder_body_default?: string | null
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          reminder_subject_default?: string | null
          subscription_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_admin?: boolean | null
          tax_id?: string | null
          time_format?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_address?: string | null
          business_city?: string | null
          business_country?: string | null
          business_email?: string | null
          business_logo?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_postal_code?: string | null
          business_state?: string | null
          business_street?: string | null
          business_street2?: string | null
          business_website?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          currency_display?: string | null
          number_format?: string | null
          date_format?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          invoice_email_message_default?: string | null
          invoice_email_subject_default?: string | null
          invoice_footer?: string | null
          invoice_notes_default?: string | null
          invoice_prefix?: string | null
          invoice_include_year?: boolean | null
          invoice_number_start?: number | null
          invoice_number_padding?: number | null
          invoice_number_reset_yearly?: boolean | null
          invoice_number_next?: number | null
          invoice_number_last_year?: number | null
          invoice_show_line_description?: boolean | null
          invoice_show_quantity?: boolean | null
          invoice_show_rate?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          payment_instructions?: string | null
          phone?: string | null
          plan_type?: string | null
          reminder_body_default?: string | null
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          reminder_subject_default?: string | null
          subscription_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_admin?: boolean | null
          tax_id?: string | null
          time_format?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      help_content: {
        Row: {
          id: string
          slug: string
          title: string
          body: string | null
          category: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          body?: string | null
          category: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          body?: string | null
          category?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          message: string
          context: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          context?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          context?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      feature_requests: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      feature_request_votes: {
        Row: {
          id: string
          user_id: string
          feature_request_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature_request_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature_request_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          }
        ]
      }
      project_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_done_status: boolean | null
          name: string
          position: number | null
          project_id: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_done_status?: boolean | null
          name: string
          position?: number | null
          project_id: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_done_status?: boolean | null
          name?: string
          position?: number | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_statuses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          hourly_rate: number | null
          icon_color: string | null
          icon_emoji: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hourly_rate?: number | null
          icon_color?: string | null
          icon_emoji?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hourly_rate?: number | null
          icon_color?: string | null
          icon_emoji?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      review_comments: {
        Row: {
          commenter_email: string | null
          commenter_name: string | null
          content: string
          created_at: string
          id: string
          review_file_id: string
          review_request_id: string
          user_id: string | null
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          commenter_email?: string | null
          commenter_name?: string | null
          content: string
          created_at?: string
          id?: string
          review_file_id: string
          review_request_id: string
          user_id?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          commenter_email?: string | null
          commenter_name?: string | null
          content?: string
          created_at?: string
          id?: string
          review_file_id?: string
          review_request_id?: string
          user_id?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_review_file_id_fkey"
            columns: ["review_file_id"]
            isOneToOne: false
            referencedRelation: "review_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          review_request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          review_request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          review_request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_files_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_folders: {
        Row: {
          color: string | null
          created_at: string
          emoji: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      review_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          review_request_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          review_request_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          review_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_recipients_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          folder_id: string | null
          id: string
          project_id: string | null
          sent_at: string | null
          share_token: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          folder_id?: string | null
          id?: string
          project_id?: string | null
          sent_at?: string | null
          share_token?: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          folder_id?: string | null
          id?: string
          project_id?: string | null
          sent_at?: string | null
          share_token?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "review_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          position: number | null
          priority: string | null
          project_id: string | null
          status: string | null
          status_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          position?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          status_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          position?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          status_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      taxes: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          rate: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          rate?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          rate?: number
          user_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          billable: boolean | null
          billing_status: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          hourly_rate: number | null
          id: string
          invoice_id: string | null
          project_id: string | null
          start_time: string
          started_at: string | null
          task_id: string | null
          total_duration_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billable?: boolean | null
          billing_status?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          invoice_id?: string | null
          project_id?: string | null
          start_time?: string
          started_at?: string | null
          task_id?: string | null
          total_duration_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billable?: boolean | null
          billing_status?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          invoice_id?: string | null
          project_id?: string | null
          start_time?: string
          started_at?: string | null
          task_id?: string | null
          total_duration_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_segments: {
        Row: {
          id: string
          time_entry_id: string
          start_time: string
          end_time: string
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          time_entry_id: string
          start_time: string
          end_time: string
          duration_seconds?: number
          created_at?: string
        }
        Update: {
          id?: string
          time_entry_id?: string
          start_time?: string
          end_time?: string
          duration_seconds?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_segments_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
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
