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
      accreditations: {
        Row: {
          admin_notes: string
          category: string
          created: string
          description: string
          feedback: string
          files: Json
          history: Json
          id: string
          kind: string
          links: string
          member: string
          member_notes: string
          reviewed_at: string | null
          reviewed_by: string
          skill_name: string
          status: string
          title: string
          updated: string
        }
        Insert: {
          admin_notes?: string
          category?: string
          created?: string
          description?: string
          feedback?: string
          files?: Json
          history?: Json
          id?: string
          kind?: string
          links?: string
          member: string
          member_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string
          skill_name: string
          status?: string
          title?: string
          updated?: string
        }
        Update: {
          admin_notes?: string
          category?: string
          created?: string
          description?: string
          feedback?: string
          files?: Json
          history?: Json
          id?: string
          kind?: string
          links?: string
          member?: string
          member_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string
          skill_name?: string
          status?: string
          title?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "accreditations_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_name: string
          created: string
          detail: string
          id: string
          target: string
        }
        Insert: {
          action: string
          actor?: string | null
          actor_name?: string
          created?: string
          detail?: string
          id?: string
          target?: string
        }
        Update: {
          action?: string
          actor?: string | null
          actor_name?: string
          created?: string
          detail?: string
          id?: string
          target?: string
        }
        Relationships: []
      }
      challenge_claims: {
        Row: {
          challenge: string
          created: string
          id: string
          member: string
        }
        Insert: {
          challenge: string
          created?: string
          id?: string
          member: string
        }
        Update: {
          challenge?: string
          created?: string
          id?: string
          member?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_claims_challenge_fkey"
            columns: ["challenge"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_claims_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          active: boolean
          badge: string
          created: string
          description: string
          id: string
          kind: string
          reward: number
          target: number
          title: string
          updated: string
        }
        Insert: {
          active?: boolean
          badge?: string
          created?: string
          description?: string
          id?: string
          kind: string
          reward?: number
          target?: number
          title: string
          updated?: string
        }
        Update: {
          active?: boolean
          badge?: string
          created?: string
          description?: string
          id?: string
          kind?: string
          reward?: number
          target?: number
          title?: string
          updated?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          booking: string | null
          conversation: string
          created: string
          id: string
          kind: string
          proposal: Json | null
          proposal_status: string
          read_at: string | null
          sender: string
        }
        Insert: {
          body?: string
          booking?: string | null
          conversation: string
          created?: string
          id?: string
          kind?: string
          proposal?: Json | null
          proposal_status?: string
          read_at?: string | null
          sender: string
        }
        Update: {
          body?: string
          booking?: string | null
          conversation?: string
          created?: string
          id?: string
          kind?: string
          proposal?: Json | null
          proposal_status?: string
          read_at?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_booking_fkey"
            columns: ["booking"]
            isOneToOne: false
            referencedRelation: "private_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_fkey"
            columns: ["conversation"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_fkey"
            columns: ["sender"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author: string
          body: string
          created: string
          hidden: boolean
          id: string
          kind: string
        }
        Insert: {
          author: string
          body: string
          created?: string
          hidden?: boolean
          id?: string
          kind?: string
        }
        Update: {
          author?: string
          body?: string
          created?: string
          hidden?: boolean
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_fkey"
            columns: ["author"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          answered_at: string | null
          created: string
          email: string
          id: string
          message: string
          name: string
          read_at: string | null
          reply_count: number
          status: string
          subject: string
        }
        Insert: {
          answered_at?: string | null
          created?: string
          email: string
          id?: string
          message: string
          name: string
          read_at?: string | null
          reply_count?: number
          status?: string
          subject?: string
        }
        Update: {
          answered_at?: string | null
          created?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read_at?: string | null
          reply_count?: number
          status?: string
          subject?: string
        }
        Relationships: []
      }
      contact_replies: {
        Row: {
          author: string
          body: string
          channel: string
          created: string
          id: string
          message: string
          sent_at: string | null
          subject: string
          to_email: string
        }
        Insert: {
          author?: string
          body?: string
          channel?: string
          created?: string
          id?: string
          message: string
          sent_at?: string | null
          subject?: string
          to_email?: string
        }
        Update: {
          author?: string
          body?: string
          channel?: string
          created?: string
          id?: string
          message?: string
          sent_at?: string | null
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_replies_message_fkey"
            columns: ["message"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created: string
          id: string
          last_message_at: string
          member_a: string
          member_b: string
        }
        Insert: {
          created?: string
          id?: string
          last_message_at?: string
          member_a: string
          member_b: string
        }
        Update: {
          created?: string
          id?: string
          last_message_at?: string
          member_a?: string
          member_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_member_a_fkey"
            columns: ["member_a"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_member_b_fkey"
            columns: ["member_b"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          actor: string | null
          avail_after: number
          avail_delta: number
          created: string
          exchange: string | null
          id: string
          idem_key: string
          member: string
          note: string
          reserved_after: number
          reserved_delta: number
          type: string
        }
        Insert: {
          actor?: string | null
          avail_after?: number
          avail_delta?: number
          created?: string
          exchange?: string | null
          id?: string
          idem_key: string
          member: string
          note?: string
          reserved_after?: number
          reserved_delta?: number
          type: string
        }
        Update: {
          actor?: string | null
          avail_after?: number
          avail_delta?: number
          created?: string
          exchange?: string | null
          id?: string
          idem_key?: string
          member?: string
          note?: string
          reserved_after?: number
          reserved_delta?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_events: {
        Row: {
          action: string
          actor: string | null
          created: string
          exchange: string
          id: string
          note: string
        }
        Insert: {
          action: string
          actor?: string | null
          created?: string
          exchange: string
          id?: string
          note?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created?: string
          exchange?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_events_exchange_fkey"
            columns: ["exchange"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      exchanges: {
        Row: {
          cancel_reason: string
          cancelled_by: string | null
          category: string
          completed_at: string | null
          created: string
          id: string
          late_cancel: boolean
          meeting_note: string
          meeting_status: string
          meeting_url: string
          message: string
          minutes: number
          mode: string
          proposed_by: string | null
          proposed_start: string | null
          provider: string
          provider_confirmed: boolean
          requester: string
          requester_confirmed: boolean
          scheduled_start: string | null
          skill: string | null
          skill_name: string
          slot_key: string
          status: string
          updated: string
        }
        Insert: {
          cancel_reason?: string
          cancelled_by?: string | null
          category?: string
          completed_at?: string | null
          created?: string
          id?: string
          late_cancel?: boolean
          meeting_note?: string
          meeting_status?: string
          meeting_url?: string
          message?: string
          minutes: number
          mode?: string
          proposed_by?: string | null
          proposed_start?: string | null
          provider: string
          provider_confirmed?: boolean
          requester: string
          requester_confirmed?: boolean
          scheduled_start?: string | null
          skill?: string | null
          skill_name?: string
          slot_key?: string
          status?: string
          updated?: string
        }
        Update: {
          cancel_reason?: string
          cancelled_by?: string | null
          category?: string
          completed_at?: string | null
          created?: string
          id?: string
          late_cancel?: boolean
          meeting_note?: string
          meeting_status?: string
          meeting_url?: string
          message?: string
          minutes?: number
          mode?: string
          proposed_by?: string | null
          proposed_start?: string | null
          provider?: string
          provider_confirmed?: boolean
          requester?: string
          requester_confirmed?: boolean
          scheduled_start?: string | null
          skill?: string | null
          skill_name?: string
          slot_key?: string
          status?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchanges_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_skill_fkey"
            columns: ["skill"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          category: string
          closed_at: string | null
          code: string
          created: string
          description: string
          files: Json
          id: string
          member: string
          related_exchange: string | null
          related_member: string
          status: string
          subject: string
          thread: Json
          updated: string
        }
        Insert: {
          category: string
          closed_at?: string | null
          code: string
          created?: string
          description: string
          files?: Json
          id?: string
          member: string
          related_exchange?: string | null
          related_member?: string
          status?: string
          subject: string
          thread?: Json
          updated?: string
        }
        Update: {
          category?: string
          closed_at?: string | null
          code?: string
          created?: string
          description?: string
          files?: Json
          id?: string
          member?: string
          related_exchange?: string | null
          related_member?: string
          status?: string
          subject?: string
          thread?: Json
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reports_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          key: string
          updated: string
          value: string
        }
        Insert: {
          key: string
          updated?: string
          value?: string
        }
        Update: {
          key?: string
          updated?: string
          value?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          fails: number
          identity: string
          last_fail: number
          locked_until: number
        }
        Insert: {
          fails?: number
          identity: string
          last_fail?: number
          locked_until?: number
        }
        Update: {
          fails?: number
          identity?: string
          last_fail?: number
          locked_until?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          availability: Json
          avatar_path: string
          bio: string
          city: string
          cover_path: string
          created: string
          email: string
          headline: string
          id: string
          lat: number
          lng: number
          name: string
          notify_sms: boolean
          notify_whatsapp: boolean
          phone: string
          share_location: boolean
          status: string
          updated: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          availability?: Json
          avatar_path?: string
          bio?: string
          city?: string
          cover_path?: string
          created?: string
          email?: string
          headline?: string
          id: string
          lat?: number
          lng?: number
          name?: string
          notify_sms?: boolean
          notify_whatsapp?: boolean
          phone?: string
          share_location?: boolean
          status?: string
          updated?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          availability?: Json
          avatar_path?: string
          bio?: string
          city?: string
          cover_path?: string
          created?: string
          email?: string
          headline?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          notify_sms?: boolean
          notify_whatsapp?: boolean
          phone?: string
          share_location?: boolean
          status?: string
          updated?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created: string
          id: string
          link: string
          member: string
          read: boolean
          ref: string
          title: string
          type: string
        }
        Insert: {
          body?: string
          created?: string
          id?: string
          link?: string
          member: string
          read?: boolean
          ref?: string
          title?: string
          type?: string
        }
        Update: {
          body?: string
          created?: string
          id?: string
          link?: string
          member?: string
          read?: boolean
          ref?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          body: string
          channel: string
          created: string
          error: string
          id: string
          member: string | null
          recipient: string
          status: string
        }
        Insert: {
          body?: string
          channel?: string
          created?: string
          error?: string
          id?: string
          member?: string | null
          recipient?: string
          status?: string
        }
        Update: {
          body?: string
          channel?: string
          created?: string
          error?: string
          id?: string
          member?: string | null
          recipient?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_member_fkey"
            columns: ["member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      private_bookings: {
        Row: {
          code: string
          conversation: string | null
          created: string
          dispute_reason: string
          ends_at: string
          history: Json
          id: string
          instructor: string
          minutes: number
          mode: string
          offer: string | null
          payment_note: string
          place: string
          price_mxn: number
          skill_name: string
          starts_at: string
          status: string
          student: string
          student_note: string
          terms: string
          title: string
          updated: string
        }
        Insert: {
          code: string
          conversation?: string | null
          created?: string
          dispute_reason?: string
          ends_at: string
          history?: Json
          id?: string
          instructor: string
          minutes: number
          mode: string
          offer?: string | null
          payment_note?: string
          place?: string
          price_mxn?: number
          skill_name?: string
          starts_at: string
          status?: string
          student: string
          student_note?: string
          terms?: string
          title?: string
          updated?: string
        }
        Update: {
          code?: string
          conversation?: string | null
          created?: string
          dispute_reason?: string
          ends_at?: string
          history?: Json
          id?: string
          instructor?: string
          minutes?: number
          mode?: string
          offer?: string | null
          payment_note?: string
          place?: string
          price_mxn?: number
          skill_name?: string
          starts_at?: string
          status?: string
          student?: string
          student_note?: string
          terms?: string
          title?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_bookings_conversation_fkey"
            columns: ["conversation"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_bookings_instructor_fkey"
            columns: ["instructor"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_bookings_offer_fkey"
            columns: ["offer"]
            isOneToOne: false
            referencedRelation: "private_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_bookings_student_fkey"
            columns: ["student"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      private_offers: {
        Row: {
          accreditation: string | null
          active: boolean
          availability: string
          cancel_terms: string
          category: string
          created: string
          description: string
          id: string
          instructor: string
          minutes: number
          mode: string
          place: string
          price_mxn: number
          skill_name: string
          title: string
          updated: string
        }
        Insert: {
          accreditation?: string | null
          active?: boolean
          availability?: string
          cancel_terms?: string
          category?: string
          created?: string
          description?: string
          id?: string
          instructor: string
          minutes: number
          mode: string
          place?: string
          price_mxn: number
          skill_name: string
          title: string
          updated?: string
        }
        Update: {
          accreditation?: string | null
          active?: boolean
          availability?: string
          cancel_terms?: string
          category?: string
          created?: string
          description?: string
          id?: string
          instructor?: string
          minutes?: number
          mode?: string
          place?: string
          price_mxn?: number
          skill_name?: string
          title?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_offers_accreditation_fkey"
            columns: ["accreditation"]
            isOneToOne: false
            referencedRelation: "accreditations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_offers_instructor_fkey"
            columns: ["instructor"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string
          created: string
          exchange: string
          id: string
          ratee: string
          rater: string
          stars: number
        }
        Insert: {
          comment?: string
          created?: string
          exchange: string
          id?: string
          ratee: string
          rater: string
          stars: number
        }
        Update: {
          comment?: string
          created?: string
          exchange?: string
          id?: string
          ratee?: string
          rater?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_exchange_fkey"
            columns: ["exchange"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_fkey"
            columns: ["ratee"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_fkey"
            columns: ["rater"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created: string
          details: string
          exchange: string | null
          handled_by: string | null
          id: string
          kind: string
          reason: string
          reported: string | null
          reporter: string
          resolution: string
          status: string
        }
        Insert: {
          created?: string
          details?: string
          exchange?: string | null
          handled_by?: string | null
          id?: string
          kind?: string
          reason?: string
          reported?: string | null
          reporter: string
          resolution?: string
          status?: string
        }
        Update: {
          created?: string
          details?: string
          exchange?: string | null
          handled_by?: string | null
          id?: string
          kind?: string
          reason?: string
          reported?: string | null
          reporter?: string
          resolution?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_exchange_fkey"
            columns: ["exchange"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_fkey"
            columns: ["reported"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_fkey"
            columns: ["reporter"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created: string
          id: string
          key: string
          updated: string
          value: string
        }
        Insert: {
          created?: string
          id?: string
          key: string
          updated?: string
          value?: string
        }
        Update: {
          created?: string
          id?: string
          key?: string
          updated?: string
          value?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          active: boolean
          category: string
          created: string
          description: string
          durations: string
          hidden: boolean
          id: string
          kind: string
          level: string
          mode: string
          name: string
          owner: string
          updated: string
        }
        Insert: {
          active?: boolean
          category?: string
          created?: string
          description?: string
          durations?: string
          hidden?: boolean
          id?: string
          kind: string
          level?: string
          mode?: string
          name: string
          owner: string
          updated?: string
        }
        Update: {
          active?: boolean
          category?: string
          created?: string
          description?: string
          durations?: string
          hidden?: boolean
          id?: string
          kind?: string
          level?: string
          mode?: string
          name?: string
          owner?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available: number
          created: string
          member: string
          received: number
          reserved: number
          updated: string
          used: number
        }
        Insert: {
          available?: number
          created?: string
          member: string
          received?: number
          reserved?: number
          updated?: string
          used?: number
        }
        Update: {
          available?: number
          created?: string
          member?: string
          received?: number
          reserved?: number
          updated?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "wallets_member_fkey"
            columns: ["member"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      tl_grant_owner_admin: {
        Args: { p_email: string; p_uid: string }
        Returns: undefined
      }
      tl_has_approved: {
        Args: { p_member: string; p_skill: string }
        Returns: boolean
      }
      tl_move: {
        Args: {
          p_actor: string
          p_avail: number
          p_exchange: string
          p_key: string
          p_member: string
          p_note: string
          p_received: number
          p_reserved: number
          p_type: string
          p_used: number
        }
        Returns: {
          available: number
          created: string
          member: string
          received: number
          reserved: number
          updated: string
          used: number
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tl_norm: { Args: { s: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
