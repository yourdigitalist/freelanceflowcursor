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
      app_branding: {
        Row: {
          favicon_url: string | null
          icon_url: string | null
          id: number
          logo_size: string | null
          logo_url: string | null
          logo_width: number | null
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          favicon_url?: string | null
          icon_url?: string | null
          id?: number
          logo_size?: string | null
          logo_url?: string | null
          logo_width?: number | null
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          favicon_url?: string | null
          icon_url?: string | null
          id?: number
          logo_size?: string | null
          logo_url?: string | null
          logo_width?: number | null
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_comms_defaults: {
        Row: {
          announcement_custom_html: string | null
          announcement_default_body: string | null
          email_footer_html: string | null
          email_header_html: string | null
          id: number
          invoice_email_message_default: string | null
          invoice_email_subject_default: string | null
          invoice_footer: string | null
          lance_email_footer_html: string | null
          lance_email_header_html: string | null
          reminder_body_default: string | null
          reminder_subject_default: string | null
          trial_body_0d: string | null
          trial_body_1d: string | null
          trial_body_5d: string | null
          updated_at: string
        }
        Insert: {
          announcement_custom_html?: string | null
          announcement_default_body?: string | null
          email_footer_html?: string | null
          email_header_html?: string | null
          id?: number
          invoice_email_message_default?: string | null
          invoice_email_subject_default?: string | null
          invoice_footer?: string | null
          lance_email_footer_html?: string | null
          lance_email_header_html?: string | null
          reminder_body_default?: string | null
          reminder_subject_default?: string | null
          trial_body_0d?: string | null
          trial_body_1d?: string | null
          trial_body_5d?: string | null
          updated_at?: string
        }
        Update: {
          announcement_custom_html?: string | null
          announcement_default_body?: string | null
          email_footer_html?: string | null
          email_header_html?: string | null
          id?: number
          invoice_email_message_default?: string | null
          invoice_email_subject_default?: string | null
          invoice_footer?: string | null
          lance_email_footer_html?: string | null
          lance_email_header_html?: string | null
          reminder_body_default?: string | null
          reminder_subject_default?: string | null
          trial_body_0d?: string | null
          trial_body_1d?: string | null
          trial_body_5d?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_icon_slots: {
        Row: {
          icon_storage_path: string | null
          icon_upload_id: string | null
          slot_key: string
        }
        Insert: {
          icon_storage_path?: string | null
          icon_upload_id?: string | null
          slot_key: string
        }
        Update: {
          icon_storage_path?: string | null
          icon_upload_id?: string | null
          slot_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_icon_slots_icon_upload_id_fkey"
            columns: ["icon_upload_id"]
            isOneToOne: false
            referencedRelation: "app_icon_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      app_icon_uploads: {
        Row: {
          created_at: string
          id: string
          name: string
          storage_path: string | null
          svg_content: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          storage_path?: string | null
          svg_content?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          storage_path?: string | null
          svg_content?: string | null
        }
        Relationships: []
      }
      client_activities: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          occurred_at: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          occurred_at?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          occurred_at?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_follow_ups: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          details: string | null
          due_at: string | null
          id: string
          remind_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          details?: string | null
          due_at?: string | null
          id?: string
          remind_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          details?: string | null
          due_at?: string | null
          id?: string
          remind_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          avatar_color: string | null
          city: string | null
          company: string | null
          company_name: string | null
          company_registration: string | null
          country: string | null
          created_at: string
          currency: string | null
          email: string | null
          entity_type: string | null
          estimated_value: number | null
          first_name: string | null
          id: string
          last_contacted_at: string | null
          last_name: string | null
          lead_source: string | null
          name: string
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string | null
          street: string | null
          street2: string | null
          tags: string[]
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_color?: string | null
          city?: string | null
          company?: string | null
          company_name?: string | null
          company_registration?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          entity_type?: string | null
          estimated_value?: number | null
          first_name?: string | null
          id?: string
          last_contacted_at?: string | null
          last_name?: string | null
          lead_source?: string | null
          name: string
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          street2?: string | null
          tags?: string[]
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_color?: string | null
          city?: string | null
          company?: string | null
          company_name?: string | null
          company_registration?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          entity_type?: string | null
          estimated_value?: number | null
          first_name?: string | null
          id?: string
          last_contacted_at?: string | null
          last_name?: string | null
          lead_source?: string | null
          name?: string
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          street2?: string | null
          tags?: string[]
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_services: {
        Row: {
          contract_id: string
          description: string | null
          id: string
          name: string
          price: number | null
          quantity: number
          service_id: string | null
          sort_order: number
        }
        Insert: {
          contract_id: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          quantity?: number
          service_id?: string | null
          sort_order?: number
        }
        Update: {
          contract_id?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          quantity?: number
          service_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_sign_tokens: {
        Row: {
          code: string
          contract_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          code: string
          contract_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          code?: string
          contract_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_sign_tokens_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          additional_clause: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_address: string | null
          client_city: string | null
          client_company: string | null
          client_company_name: string | null
          client_company_registration: string | null
          client_complement: string | null
          client_country: string | null
          client_email: string | null
          client_entity_type: string
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_sign_device: string | null
          client_sign_email_verified: boolean
          client_sign_geo: string | null
          client_sign_ip: string | null
          client_sign_isp: string | null
          client_signed_at: string | null
          client_signed_name: string | null
          client_state: string | null
          client_street: string | null
          client_street2: string | null
          client_tax_id: string | null
          client_zip: string | null
          created_at: string
          discount: number | null
          discount_type: string | null
          freelancer_address: string | null
          freelancer_city: string | null
          freelancer_company: string | null
          freelancer_company_name: string | null
          freelancer_company_registration: string | null
          freelancer_complement: string | null
          freelancer_country: string | null
          freelancer_email: string | null
          freelancer_name: string | null
          freelancer_phone: string | null
          freelancer_sign_device: string | null
          freelancer_sign_email_verified: boolean
          freelancer_sign_geo: string | null
          freelancer_sign_ip: string | null
          freelancer_sign_isp: string | null
          freelancer_signed_at: string | null
          freelancer_signed_name: string | null
          freelancer_state: string | null
          freelancer_street: string | null
          freelancer_street2: string | null
          freelancer_tax_id: string | null
          freelancer_zip: string | null
          id: string
          identifier: string
          immediate_availability: boolean
          installment_description: string | null
          payment_link: string | null
          payment_methods: string[]
          payment_structure: string | null
          project_id: string | null
          proposal_id: string | null
          public_token: string
          reminder_near_end: boolean
          sent_at: string | null
          status: string
          subtotal: number
          template_id: string | null
          timeline_days: number | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_clause?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_address?: string | null
          client_city?: string | null
          client_company?: string | null
          client_company_name?: string | null
          client_company_registration?: string | null
          client_complement?: string | null
          client_country?: string | null
          client_email?: string | null
          client_entity_type?: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_sign_device?: string | null
          client_sign_email_verified?: boolean
          client_sign_geo?: string | null
          client_sign_ip?: string | null
          client_sign_isp?: string | null
          client_signed_at?: string | null
          client_signed_name?: string | null
          client_state?: string | null
          client_street?: string | null
          client_street2?: string | null
          client_tax_id?: string | null
          client_zip?: string | null
          created_at?: string
          discount?: number | null
          discount_type?: string | null
          freelancer_address?: string | null
          freelancer_city?: string | null
          freelancer_company?: string | null
          freelancer_company_name?: string | null
          freelancer_company_registration?: string | null
          freelancer_complement?: string | null
          freelancer_country?: string | null
          freelancer_email?: string | null
          freelancer_name?: string | null
          freelancer_phone?: string | null
          freelancer_sign_device?: string | null
          freelancer_sign_email_verified?: boolean
          freelancer_sign_geo?: string | null
          freelancer_sign_ip?: string | null
          freelancer_sign_isp?: string | null
          freelancer_signed_at?: string | null
          freelancer_signed_name?: string | null
          freelancer_state?: string | null
          freelancer_street?: string | null
          freelancer_street2?: string | null
          freelancer_tax_id?: string | null
          freelancer_zip?: string | null
          id?: string
          identifier?: string
          immediate_availability?: boolean
          installment_description?: string | null
          payment_link?: string | null
          payment_methods?: string[]
          payment_structure?: string | null
          project_id?: string | null
          proposal_id?: string | null
          public_token?: string
          reminder_near_end?: boolean
          sent_at?: string | null
          status?: string
          subtotal?: number
          template_id?: string | null
          timeline_days?: number | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_clause?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_address?: string | null
          client_city?: string | null
          client_company?: string | null
          client_company_name?: string | null
          client_company_registration?: string | null
          client_complement?: string | null
          client_country?: string | null
          client_email?: string | null
          client_entity_type?: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_sign_device?: string | null
          client_sign_email_verified?: boolean
          client_sign_geo?: string | null
          client_sign_ip?: string | null
          client_sign_isp?: string | null
          client_signed_at?: string | null
          client_signed_name?: string | null
          client_state?: string | null
          client_street?: string | null
          client_street2?: string | null
          client_tax_id?: string | null
          client_zip?: string | null
          created_at?: string
          discount?: number | null
          discount_type?: string | null
          freelancer_address?: string | null
          freelancer_city?: string | null
          freelancer_company?: string | null
          freelancer_company_name?: string | null
          freelancer_company_registration?: string | null
          freelancer_complement?: string | null
          freelancer_country?: string | null
          freelancer_email?: string | null
          freelancer_name?: string | null
          freelancer_phone?: string | null
          freelancer_sign_device?: string | null
          freelancer_sign_email_verified?: boolean
          freelancer_sign_geo?: string | null
          freelancer_sign_ip?: string | null
          freelancer_sign_isp?: string | null
          freelancer_signed_at?: string | null
          freelancer_signed_name?: string | null
          freelancer_state?: string | null
          freelancer_street?: string | null
          freelancer_street2?: string | null
          freelancer_tax_id?: string | null
          freelancer_zip?: string | null
          id?: string
          identifier?: string
          immediate_availability?: boolean
          installment_description?: string | null
          payment_link?: string | null
          payment_methods?: string[]
          payment_structure?: string | null
          project_id?: string | null
          proposal_id?: string | null
          public_token?: string
          reminder_near_end?: boolean
          sent_at?: string | null
          status?: string
          subtotal?: number
          template_id?: string | null
          timeline_days?: number | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          context: string | null
          created_at: string
          current_tools: Json | null
          first_feature: string | null
          freelance_area: string | null
          id: string
          impression: number | null
          message: string | null
          pricing_feel: string | null
          status: string
          user_id: string
          what_broke: string | null
          wish_list: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          current_tools?: Json | null
          first_feature?: string | null
          freelance_area?: string | null
          id?: string
          impression?: number | null
          message?: string | null
          pricing_feel?: string | null
          status?: string
          user_id: string
          what_broke?: string | null
          wish_list?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          current_tools?: Json | null
          first_feature?: string | null
          freelance_area?: string | null
          id?: string
          impression?: number | null
          message?: string | null
          pricing_feel?: string | null
          status?: string
          user_id?: string
          what_broke?: string | null
          wish_list?: string | null
        }
        Relationships: []
      }
      help_content: {
        Row: {
          body: string | null
          category: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          category: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          category?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
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
          line_date: string | null
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
          line_date?: string | null
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
          line_date?: string | null
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
      invoice_time_entry_links: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          invoice_item_id: string | null
          time_entry_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          invoice_item_id?: string | null
          time_entry_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          invoice_item_id?: string | null
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_time_entry_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_time_entry_links_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_time_entry_links_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
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
      landing_content: {
        Row: {
          content: Json
          id: number
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      note_folders: {
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
      notes: {
        Row: {
          client_id: string | null
          content: string | null
          cover_color: string | null
          created_at: string
          folder_id: string | null
          icon_emoji: string | null
          id: string
          note_comment: string | null
          project_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          cover_color?: string | null
          created_at?: string
          folder_id?: string | null
          icon_emoji?: string | null
          id?: string
          note_comment?: string | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: string | null
          cover_color?: string | null
          created_at?: string
          folder_id?: string | null
          icon_emoji?: string | null
          id?: string
          note_comment?: string | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_key: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_key?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_key?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          client_email_footer_html: string | null
          client_email_header_html: string | null
          client_email_primary_color: string | null
          company_name: string | null
          created_at: string
          currency: string | null
          currency_display: string | null
          date_format: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          invoice_bank_details_default: string | null
          invoice_email_message_default: string | null
          invoice_email_subject_default: string | null
          invoice_footer: string | null
          invoice_include_year: boolean | null
          invoice_notes_default: string | null
          invoice_number_last_year: number | null
          invoice_number_next: number | null
          invoice_number_padding: number | null
          invoice_number_reset_yearly: boolean | null
          invoice_number_start: number | null
          invoice_prefix: string | null
          invoice_show_line_date: boolean | null
          invoice_show_line_description: boolean | null
          invoice_show_quantity: boolean | null
          invoice_show_rate: boolean | null
          is_admin: boolean | null
          last_name: string | null
          notification_preferences: Json | null
          number_format: string | null
          onboarding_completed: boolean | null
          payment_instructions: string | null
          phone: string | null
          plan_type: string | null
          proposal_default_conditions_notes: string | null
          proposal_default_cover_image_url: string | null
          proposal_default_immediate_availability: boolean
          proposal_default_installment_description: string | null
          proposal_default_payment_methods: string[]
          proposal_default_payment_structure: string | null
          proposal_default_validity_days: number
          reminder_body_default: string | null
          reminder_days_before: number | null
          reminder_enabled: boolean | null
          reminder_subject_default: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
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
          client_email_footer_html?: string | null
          client_email_header_html?: string | null
          client_email_primary_color?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          currency_display?: string | null
          date_format?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          invoice_bank_details_default?: string | null
          invoice_email_message_default?: string | null
          invoice_email_subject_default?: string | null
          invoice_footer?: string | null
          invoice_include_year?: boolean | null
          invoice_notes_default?: string | null
          invoice_number_last_year?: number | null
          invoice_number_next?: number | null
          invoice_number_padding?: number | null
          invoice_number_reset_yearly?: boolean | null
          invoice_number_start?: number | null
          invoice_prefix?: string | null
          invoice_show_line_date?: boolean | null
          invoice_show_line_description?: boolean | null
          invoice_show_quantity?: boolean | null
          invoice_show_rate?: boolean | null
          is_admin?: boolean | null
          last_name?: string | null
          notification_preferences?: Json | null
          number_format?: string | null
          onboarding_completed?: boolean | null
          payment_instructions?: string | null
          phone?: string | null
          plan_type?: string | null
          proposal_default_conditions_notes?: string | null
          proposal_default_cover_image_url?: string | null
          proposal_default_immediate_availability?: boolean
          proposal_default_installment_description?: string | null
          proposal_default_payment_methods?: string[]
          proposal_default_payment_structure?: string | null
          proposal_default_validity_days?: number
          reminder_body_default?: string | null
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          reminder_subject_default?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
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
          client_email_footer_html?: string | null
          client_email_header_html?: string | null
          client_email_primary_color?: string | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          currency_display?: string | null
          date_format?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          invoice_bank_details_default?: string | null
          invoice_email_message_default?: string | null
          invoice_email_subject_default?: string | null
          invoice_footer?: string | null
          invoice_include_year?: boolean | null
          invoice_notes_default?: string | null
          invoice_number_last_year?: number | null
          invoice_number_next?: number | null
          invoice_number_padding?: number | null
          invoice_number_reset_yearly?: boolean | null
          invoice_number_start?: number | null
          invoice_prefix?: string | null
          invoice_show_line_date?: boolean | null
          invoice_show_line_description?: boolean | null
          invoice_show_quantity?: boolean | null
          invoice_show_rate?: boolean | null
          is_admin?: boolean | null
          last_name?: string | null
          notification_preferences?: Json | null
          number_format?: string | null
          onboarding_completed?: boolean | null
          payment_instructions?: string | null
          phone?: string | null
          plan_type?: string | null
          proposal_default_conditions_notes?: string | null
          proposal_default_cover_image_url?: string | null
          proposal_default_immediate_availability?: boolean
          proposal_default_installment_description?: string | null
          proposal_default_payment_methods?: string[]
          proposal_default_payment_structure?: string | null
          proposal_default_validity_days?: number
          reminder_body_default?: string | null
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          reminder_subject_default?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
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
      proposal_services: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_recurring: boolean
          line_total: number
          name: string
          position: number
          price: number
          proposal_id: string
          quantity: number
          recurrence_period: string
          service_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          line_total?: number
          name: string
          position?: number
          price?: number
          proposal_id: string
          quantity?: number
          recurrence_period?: string
          service_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          line_total?: number
          name?: string
          position?: number
          price?: number
          proposal_id?: string
          quantity?: number
          recurrence_period?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_services_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          availability_required: boolean
          client_id: string
          conditions_notes: string | null
          cover_image_url: string | null
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          identifier: string
          installment_description: string | null
          objective: string | null
          payment_methods: string[]
          payment_structure: string | null
          presentation: string | null
          project_id: string | null
          public_token: string
          read_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          timeline_days: number | null
          total: number
          updated_at: string
          user_id: string
          validity_days: number
        }
        Insert: {
          accepted_at?: string | null
          availability_required?: boolean
          client_id: string
          conditions_notes?: string | null
          cover_image_url?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          identifier: string
          installment_description?: string | null
          objective?: string | null
          payment_methods?: string[]
          payment_structure?: string | null
          presentation?: string | null
          project_id?: string | null
          public_token?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          timeline_days?: number | null
          total?: number
          updated_at?: string
          user_id: string
          validity_days?: number
        }
        Update: {
          accepted_at?: string | null
          availability_required?: boolean
          client_id?: string
          conditions_notes?: string | null
          cover_image_url?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          identifier?: string
          installment_description?: string | null
          objective?: string | null
          payment_methods?: string[]
          payment_structure?: string | null
          presentation?: string | null
          project_id?: string | null
          public_token?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          timeline_days?: number | null
          total?: number
          updated_at?: string
          user_id?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      services: {
        Row: {
          created_at: string
          currency: string
          default_tasks: Json
          description: string | null
          id: string
          is_recurring: boolean
          name: string
          price: number | null
          recurrence_period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          default_tasks?: Json
          description?: string | null
          id?: string
          is_recurring?: boolean
          name: string
          price?: number | null
          recurrence_period?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          default_tasks?: Json
          description?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          price?: number | null
          recurrence_period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          start_time: string
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
          created_at: string
          duration_seconds: number
          end_time: string
          id: string
          start_time: string
          time_entry_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          end_time: string
          id?: string
          start_time: string
          time_entry_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          end_time?: string
          id?: string
          start_time?: string
          time_entry_id?: string
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
      get_admin_stats: { Args: never; Returns: Json }
      get_announcement_recipient_count: { Args: never; Returns: number }
      next_invoice_number: { Args: { p_user_id: string }; Returns: string }
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
