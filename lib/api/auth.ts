import { API_BASE_URL } from "@/lib/api/config";

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id:    string;
      email: string;
      name?: string;
      role?: string;
    };
  };
}

export async function loginApi(email: string, password: string): Promise<LoginResponse["data"]> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });

  const json: LoginResponse = await res.json();

  if (!res.ok || !json.success) {
    throw new Error((json as unknown as { message?: string }).message ?? "Invalid credentials");
  }

  return json.data;          // ← returns { token, user }
}
