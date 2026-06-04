export type Application = {
  id: number;
  fio: string;
  phone: string;
  email: string;
  registration_date: string;
  registration_time: string;
  created_at: string;
};

export type RegistrationPayload = {
  fio: string;
  phone: string;
  email: string;
  registration_date: string;
  registration_time: string;
};

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

export function getSlotsStatus(date: string) {
  return request<Record<string, number>>(`/api/slots-status/${date}`);
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

export function getApplications(token: string) {
  return request<Application[]>("/api/admin/applications", {
    headers: {
      Authorization: token,
    },
  });
}
