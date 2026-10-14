// Hand-maintained to match supabase/migrations. Regenerate with:
//   npx supabase gen types typescript --local > lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type PersonRow = {
  id: string;
  name: string;
  initials: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

type BoardColumnRow = {
  id: string;
  key: string;
  name: string;
  position: number;
  default_owner_id: string | null;
  description: string | null;
  created_at: string;
};

type AllowedUserRow = {
  email: string;
  display_name: string | null;
  person_id: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  person_id: string | null;
  created_at: string;
  updated_at: string;
};

type TicketRow = {
  id: string;
  number: number;
  code: string;
  title: string;
  client: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  site_address: string | null;
  category_id: string | null;
  description: string | null;
  date_received: string;
  first_site_visit: string | null;
  scheduled_date: string | null;
  assigned_to_id: string | null;
  owner_id: string | null;
  is_upgrade: boolean;
  column_id: string;
  column_entered_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TicketMoveRow = {
  id: string;
  ticket_id: string;
  from_column_id: string | null;
  to_column_id: string;
  moved_by: string | null;
  moved_by_name: string;
  moved_at: string;
};

type TicketNoteRow = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

type TicketAttachmentRow = {
  id: string;
  ticket_id: string;
  kind: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      people: {
        Row: PersonRow;
        Insert: {
          id?: string;
          name: string;
          initials: string;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<PersonRow>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: {
          id?: string;
          name: string;
          color?: string;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      board_columns: {
        Row: BoardColumnRow;
        Insert: {
          id?: string;
          key: string;
          name: string;
          position: number;
          default_owner_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<BoardColumnRow>;
        Relationships: [];
      };
      allowed_users: {
        Row: AllowedUserRow;
        Insert: {
          email: string;
          display_name?: string | null;
          person_id?: string | null;
          created_at?: string;
        };
        Update: Partial<AllowedUserRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email: string;
          display_name: string;
          person_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      tickets: {
        Row: TicketRow;
        Insert: {
          id?: string;
          number?: number;
          title: string;
          client: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          site_address?: string | null;
          category_id?: string | null;
          description?: string | null;
          date_received?: string;
          first_site_visit?: string | null;
          scheduled_date?: string | null;
          assigned_to_id?: string | null;
          owner_id?: string | null;
          is_upgrade?: boolean;
          column_id?: string;
          column_entered_at?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TicketRow, "code">>;
        Relationships: [];
      };
      ticket_moves: {
        Row: TicketMoveRow;
        Insert: {
          id?: string;
          ticket_id: string;
          from_column_id?: string | null;
          to_column_id: string;
          moved_by?: string | null;
          moved_by_name?: string;
          moved_at?: string;
        };
        Update: Partial<TicketMoveRow>;
        Relationships: [];
      };
      ticket_notes: {
        Row: TicketNoteRow;
        Insert: {
          id?: string;
          ticket_id: string;
          author_id?: string | null;
          author_name: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<TicketNoteRow>;
        Relationships: [];
      };
      ticket_attachments: {
        Row: TicketAttachmentRow;
        Insert: {
          id?: string;
          ticket_id: string;
          kind?: string;
          file_name: string;
          storage_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          uploaded_by_name: string;
          created_at?: string;
        };
        Update: Partial<TicketAttachmentRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_allowed: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_email_allowed: { Args: { p_email: string }; Returns: boolean };
      current_display_name: { Args: Record<PropertyKey, never>; Returns: string };
      move_ticket: { Args: { p_ticket_id: string; p_column_id: string }; Returns: TicketRow };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
