export type Role = "trainer" | "client";
export type MemberStatus = "active" | "pending";
export type BookingStatus = "confirmed" | "cancelled" | "completed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          default_role: Role | null;
          bio: string | null;
          specialties: string[] | null;
          goals: string | null;
          phone: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          default_role?: Role | null;
          bio?: string | null;
          specialties?: string[] | null;
          goals?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          default_role?: Role | null;
          bio?: string | null;
          specialties?: string[] | null;
          goals?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_trainer_invites: {
        Row: {
          id: string;
          code: string;
          name: string | null;
          phone: string | null;
          status: string;
          accepted_by: string | null;
          accepted_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          name?: string | null;
          phone?: string | null;
          status?: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string | null;
          phone?: string | null;
          status?: string;
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          timezone: string;
          owner_id: string;
          is_base: boolean;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          timezone?: string;
          owner_id: string;
          is_base?: boolean;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          timezone?: string;
          owner_id?: string;
          is_base?: boolean;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      location_members: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
          role: Role;
          status: MemberStatus;
          joined_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          role: Role;
          status?: MemberStatus;
          joined_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          user_id?: string;
          role?: Role;
          status?: MemberStatus;
          joined_at?: string;
        };
        Relationships: [];
      };
      availability: {
        Row: {
          id: string;
          trainer_id: string;
          location_id: string;
          date: string;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          location_id: string;
          date: string;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          location_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_blocks: {
        Row: {
          id: string;
          trainer_id: string;
          location_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          label: string | null;
          starts_on: string;
          ends_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          location_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          label?: string | null;
          starts_on?: string;
          ends_on?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          location_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          label?: string | null;
          starts_on?: string;
          ends_on?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          location_id: string;
          trainer_id: string;
          client_id: string;
          start_time: string;
          end_time: string;
          status: BookingStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          trainer_id: string;
          client_id: string;
          start_time: string;
          end_time: string;
          status?: BookingStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          trainer_id?: string;
          client_id?: string;
          start_time?: string;
          end_time?: string;
          status?: BookingStatus;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_rosters: {
        Row: {
          trainer_id: string;
          client_id: string;
          location_id: string;
          created_at: string;
        };
        Insert: {
          trainer_id: string;
          client_id: string;
          location_id: string;
          created_at?: string;
        };
        Update: {
          trainer_id?: string;
          client_id?: string;
          location_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      location_invites: {
        Row: {
          id: string;
          trainer_id: string;
          location_id: string;
          phone: string;
          role: Role;
          status: "pending" | "accepted";
          accepted_by: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          location_id: string;
          phone: string;
          role?: Role;
          status?: "pending" | "accepted";
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          location_id?: string;
          phone?: string;
          role?: Role;
          status?: "pending" | "accepted";
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          location_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string;
          type: string;
          booking_id: string | null;
          slot_offer_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id: string;
          type?: string;
          booking_id?: string | null;
          slot_offer_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string;
          type?: string;
          booking_id?: string | null;
          slot_offer_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      slot_offers: {
        Row: {
          id: string;
          trainer_id: string;
          location_id: string;
          start_time: string;
          end_time: string;
          status: string;
          filled_booking_id: string | null;
          source_booking_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          location_id: string;
          start_time: string;
          end_time: string;
          status?: string;
          filled_booking_id?: string | null;
          source_booking_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          location_id?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          filled_booking_id?: string | null;
          source_booking_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      slot_offer_requests: {
        Row: {
          id: string;
          slot_offer_id: string;
          client_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_offer_id: string;
          client_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slot_offer_id?: string;
          client_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      location_by_invite_code: {
        Args: { p_code: string };
        Returns: { id: string; name: string }[];
      };
      recurring_blocks_for_date: {
        Args: { p_trainer_id: string; p_location_id: string; p_date: string };
        Returns: { start_time: string; end_time: string }[];
      };
      is_admin: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      notify_booking_cancelled: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      notify_slot_offer_available: {
        Args: { p_slot_offer_id: string };
        Returns: undefined;
      };
      notify_slot_offer_requested: {
        Args: { p_slot_offer_id: string };
        Returns: undefined;
      };
      notify_slot_offer_result: {
        Args: { p_slot_offer_id: string; p_winning_client_id: string };
        Returns: undefined;
      };
      redeem_trainer_activation_code: {
        Args: { p_code: string; p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
