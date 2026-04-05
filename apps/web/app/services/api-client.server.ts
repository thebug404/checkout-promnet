import type { SessionUser } from "./session.server"
import { env } from "./env.server"

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "")
  }

  private async request<T>(
    path: string,
    user: SessionUser,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/v1${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new ApiError(response.status, (error as { error?: string }).error ?? "Unknown error")
    }

    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  async get<T>(path: string, user: SessionUser): Promise<T> {
    return this.request<T>(path, user)
  }

  async post<T>(path: string, user: SessionUser, body?: unknown): Promise<T> {
    return this.request<T>(path, user, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(path: string, user: SessionUser, body: unknown): Promise<T> {
    return this.request<T>(path, user, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  }

  async delete<T>(path: string, user: SessionUser): Promise<T> {
    return this.request<T>(path, user, { method: "DELETE" })
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const apiClient = new ApiClient(env.API_BASE_URL)
