export type { Wedding, Media, Account, Partner } from "./models";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error || "İşlem tamamlanamadı.", response.status);
  return data as T;
}
