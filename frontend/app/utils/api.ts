import {
  User,
  GraphEntity,
  GraphRelationship,
  KnowledgeSource,
  ReasoningRequest,
  ReasoningResult,
  CommunityPost,
  DashboardSummary,
} from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class APIError extends Error {
  status: number;
  title: string;
  type?: string;

  constructor(status: number, title: string, type?: string) {
    super(title);
    this.name = "APIError";
    this.status = status;
    this.title = title;
    this.type = type;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  // Add Auth header if token exists in localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let errorTitle = `Request failed with status ${res.status}`;
    let errorType = "about:blank";
    try {
      const data = await res.json();
      errorTitle = data.title || data.detail || errorTitle;
      errorType = data.type || errorType;
    } catch {
      // ignore
    }
    throw new APIError(res.status, errorTitle, errorType);
  }

  return res.json() as Promise<T>;
}

export const api = {
  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
    const data = await request<{ access_token: string; refresh_token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    return data;
  },

  async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  },

  async getMe(): Promise<User> {
    return request<User>("/api/v1/auth/me");
  },

  async searchEntities(params: {
    q?: string;
    labels?: string[];
    theme?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
    limit?: number;
  }): Promise<{ items: GraphEntity[] }> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append("q", params.q);
    if (params.labels) {
      params.labels.forEach((lbl) => searchParams.append("labels", lbl));
    }
    if (params.theme) searchParams.append("theme", params.theme);
    if (params.latitude !== undefined) searchParams.append("latitude", String(params.latitude));
    if (params.longitude !== undefined) searchParams.append("longitude", String(params.longitude));
    if (params.radius_meters !== undefined) searchParams.append("radius_meters", String(params.radius_meters));
    if (params.limit !== undefined) searchParams.append("limit", String(params.limit));

    const queryStr = searchParams.toString();
    return request<{ items: GraphEntity[] }>(`/api/v1/graph/entities${queryStr ? `?${queryStr}` : ""}`);
  },

  async getEntity(entityId: string): Promise<GraphEntity> {
    return request<GraphEntity>(`/api/v1/graph/entities/${entityId}`);
  },

  async getEntitySources(entityId: string): Promise<{ items: KnowledgeSource[] }> {
    return request<{ items: KnowledgeSource[] }>(`/api/v1/graph/entities/${entityId}/sources`);
  },

  async getEntityNeighbors(
    entityId: string,
    relationshipTypes?: string[],
    depth = 1,
    limit = 20
  ): Promise<{ items: { relationship: GraphRelationship; entity: GraphEntity }[] }> {
    const searchParams = new URLSearchParams();
    if (relationshipTypes) {
      relationshipTypes.forEach((t) => searchParams.append("relationship_types", t));
    }
    searchParams.append("depth", String(depth));
    searchParams.append("limit", String(limit));

    return request<{ items: { relationship: GraphRelationship; entity: GraphEntity }[] }>(
      `/api/v1/graph/entities/${entityId}/neighbors?${searchParams.toString()}`
    );
  },

  async aiReason(body: ReasoningRequest): Promise<ReasoningResult> {
    return request<ReasoningResult>("/api/v1/ai/reason", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async aiEnrich(text: string, language: string): Promise<unknown> {
    return request<unknown>("/api/v1/ai/enrich", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    });
  },

  async getRecommendations(params: {
    themes?: string[];
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
    limit?: number;
  }): Promise<{ items: { entity: GraphEntity; score: number; reasons: string[] }[] }> {
    const searchParams = new URLSearchParams();
    if (params.themes) {
      params.themes.forEach((t) => searchParams.append("themes", t));
    }
    if (params.latitude !== undefined) searchParams.append("latitude", String(params.latitude));
    if (params.longitude !== undefined) searchParams.append("longitude", String(params.longitude));
    if (params.radius_meters !== undefined) searchParams.append("radius_meters", String(params.radius_meters));
    if (params.limit !== undefined) searchParams.append("limit", String(params.limit));

    const queryStr = searchParams.toString();
    return request<{ items: { entity: GraphEntity; score: number; reasons: string[] }[] }>(
      `/api/v1/recommendations${queryStr ? `?${queryStr}` : ""}`
    );
  },

  async createCommunityPost(body: {
    title: string;
    body: string;
    language: string;
    visibility: string;
    related_entity_ids?: string[];
  }): Promise<CommunityPost> {
    return request<CommunityPost>("/api/v1/community/posts", {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        body: body.body,
        language: body.language,
        visibility: body.visibility,
        related_entity_ids: body.related_entity_ids || [],
      }),
    });
  },

  async listCommunityPosts(status?: string, limit = 20): Promise<{ items: CommunityPost[] }> {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append("status", status);
    searchParams.append("limit", String(limit));
    return request<{ items: CommunityPost[] }>(`/api/v1/community/posts?${searchParams.toString()}`);
  },

  async submitCommunityPost(postId: string): Promise<CommunityPost> {
    return request<CommunityPost>(`/api/v1/community/posts/${postId}/submit`, {
      method: "POST",
    });
  },

  async moderateCommunityPost(postId: string, approve: boolean): Promise<CommunityPost> {
    return request<CommunityPost>(`/api/v1/community/posts/${postId}/moderate`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    });
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>("/api/v1/dashboard/summary");
  },
};
