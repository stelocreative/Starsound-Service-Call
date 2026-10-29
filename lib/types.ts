import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Person = Tables["people"]["Row"];
export type Category = Tables["categories"]["Row"];
export type BoardColumn = Tables["board_columns"]["Row"];
export type Ticket = Tables["tickets"]["Row"];
export type TicketInsert = Tables["tickets"]["Insert"];
export type TicketUpdate = Tables["tickets"]["Update"];
export type TicketMove = Tables["ticket_moves"]["Row"];
export type TicketNote = Tables["ticket_notes"]["Row"];
export type TicketAttachment = Tables["ticket_attachments"]["Row"];
export type AllowedUser = Tables["allowed_users"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type DisplaySettings = Tables["display_settings"]["Row"];

export type AttachmentKind = "quote" | "invoice" | "other";
export const ATTACHMENT_KINDS: { value: AttachmentKind; label: string }[] = [
  { value: "quote", label: "Quote" },
  { value: "invoice", label: "Invoice" },
  { value: "other", label: "Other" },
];

export type CategoryColor =
  | "blue"
  | "yellow"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "teal"
  | "pink"
  | "gray";

export type ReferenceData = {
  columns: BoardColumn[];
  people: Person[];
  categories: Category[];
};

export type BoardData = ReferenceData & {
  tickets: Ticket[];
};

export type TicketDetail = {
  notes: TicketNote[];
  attachments: TicketAttachment[];
  moves: TicketMove[];
};

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  personId: string | null;
};

export const PAID_KEY = "paid";
export const NEW_KEY = "new";
