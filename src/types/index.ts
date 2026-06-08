export type Application = {
  id: number;
  fio: string;
  phone: string;
  email: string;
  registration_date: string;
  registration_time: string;
  created_at: string;
  status: "pending" | "confirmed" | "rejected";
};

export type RegistrationPayload = {
  fio: string;
  phone: string;
  email: string;
  registration_date: string;
  registration_time: string;
};

export type SlotInfo = {
  occupied: number;
  max_capacity: number;
  is_blocked: boolean;
};

export type SlotsStatusResponse = {
  date_blocked: boolean;
  slots: Record<string, SlotInfo>;
};

export type SlotConfigsResponse = Record<string, SlotInfo>;

export type AllowedMonth = { year: number; month: number };

export type ApplicationsParams = {
  page?: number;
  page_size?: number;
  search?: string;
  sort?: "fio" | "registration_date" | "registration_time" | "created_at";
  order?: "asc" | "desc";
};

export type ApplicationsPage = {
  items: Application[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type ArchivedApplication = {
  id: number;
  original_id: number;
  fio: string;
  phone: string;
  email: string;
  registration_date: string;
  registration_time: string;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
  archived_at: string;
};

export type ArchivePage = {
  items: ArchivedApplication[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};
