const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function req(path: string, body: object, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  register: (email: string, password: string) =>
    req("/auth/register", { email, password }),
  login: (email: string, password: string) =>
    req("/auth/login", { email, password }),
  onboard: (body: object, token: string) =>
    req("/onboarding/", body, token),
  dashboard: async (token: string) => {
    const res = await fetch(`${API}/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  },
};
