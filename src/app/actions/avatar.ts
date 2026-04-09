"use server";

import { getAuthToken } from "@/infrastructure/api/apiClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export async function uploadAvatar(
  formData: FormData,
): Promise<{ avatarUrl?: string; error?: string }> {
  const token = await getAuthToken();

  const res = await fetch(`${API_URL}/api/v1/account/avatar/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Upload failed: ${text}` };
  }

  const data = (await res.json()) as { avatar_url: string };
  return { avatarUrl: data.avatar_url };
}

export async function deleteAvatar(): Promise<{ error?: string }> {
  const token = await getAuthToken();

  const res = await fetch(`${API_URL}/api/v1/account/avatar/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Delete failed: ${text}` };
  }

  return {};
}
