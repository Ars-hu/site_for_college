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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error ?? data?.message ?? `Ошибка запроса: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function getAllowedMonths() {
  return request<AllowedMonth[]>("/api/allowed-months");
}

export function getSlotsStatus(date: string) {
  return request<SlotsStatusResponse>(`/api/slots-status/${date}`);
}

export function getDatesStatus() {
  return request<{ blocked_dates: string[]; full_dates: string[]; opened_weekends: string[] }>("/api/dates-status");
}

export function registerApplication(payload: RegistrationPayload) {
  return request<{ message: string; id: number }>("/api/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginAdmin(username: string, password: string) {
  return request<{ token: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

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

export function getApplications(token: string, params: ApplicationsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page)      qs.set("page",      String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  if (params.search)    qs.set("search",    params.search);
  if (params.sort)      qs.set("sort",      params.sort);
  if (params.order)     qs.set("order",     params.order);
  const query = qs.toString() ? `?${qs}` : "";
  return request<ApplicationsPage>(`/api/admin/applications${query}`, {
    headers: { Authorization: token },
  });
}

export function getBlockedDates(token: string) {
  return request<{ blocked_dates: string[]; opened_weekends: string[] }>("/api/admin/blocked-dates", {
    headers: { Authorization: token },
  });
}

export function getAdminAllowedMonths(token: string) {
  return request<AllowedMonth[]>("/api/admin/allowed-months", {
    headers: { Authorization: token },
  });
}

export function addAllowedMonth(token: string, year: number, month: number) {
  return request<AllowedMonth>("/api/admin/add-month", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify({ year, month }),
  });
}

export function removeAllowedMonth(token: string, year: number, month: number) {
  return request<{ removed: boolean }>("/api/admin/remove-month", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify({ year, month }),
  });
}

export function toggleWeekend(token: string, date: string) {
  return request<{ opened: boolean; date: string }>("/api/admin/toggle-weekend", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify({ date }),
  });
}

export function toggleDate(token: string, date: string) {
  return request<{ blocked: boolean; date: string }>("/api/admin/toggle-date", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify({ date }),
  });
}

export function getSlotConfigs(token: string, date: string) {
  return request<SlotConfigsResponse>(`/api/admin/slot-configs/${date}`, {
    headers: { Authorization: token },
  });
}

export function updateSlot(
  token: string,
  date: string,
  time: string,
  params: { max_capacity?: number; is_blocked?: boolean }
) {
  return request<SlotInfo & { date: string; time: string }>("/api/admin/update-slot", {
    method: "POST",
    headers: { Authorization: token },
    body: JSON.stringify({ date, time, ...params }),
  });
}

export function deleteApplication(token: string, id: number) {
  return request<{ deleted: boolean; id: number }>(
    `/api/admin/applications/${id}`,
    { method: "DELETE", headers: { Authorization: token } }
  );
}

export function updateApplicationStatus(
  token: string,
  id: number,
  status: "pending" | "confirmed" | "rejected"
) {
  return request<{ id: number; status: string }>(
    `/api/admin/applications/${id}/status`,
    {
      method: "PATCH",
      headers: { Authorization: token },
      body: JSON.stringify({ status }),
    }
  );
}
