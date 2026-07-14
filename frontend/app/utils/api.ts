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
import { supabase } from "./supabase";

class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "APIError";
  }
}

type EntityRow = {
  id: string;
  labels: string[];
  name_th: string;
  name_en: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  visibility: GraphEntity["visibility"];
  properties: Record<string, unknown> | null;
};

const entityFromRow = (row: EntityRow): GraphEntity => ({
  id: row.id,
  labels: row.labels || [],
  nameTh: row.name_th,
  nameEn: row.name_en,
  description: row.description,
  latitude: row.latitude,
  longitude: row.longitude,
  visibility: row.visibility,
  properties: row.properties || {},
});

const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fail = (message: string): never => { throw new APIError(message); };

async function allEntities(): Promise<GraphEntity[]> {
  const { data, error } = await supabase
    .from("nan_graph_entities")
    .select("id,labels,name_th,name_en,description,latitude,longitude,visibility,properties")
    .eq("visibility", "public")
    .order("name_th");
  if (error) fail(error.message);
  return ((data || []) as EntityRow[]).map(entityFromRow);
}

export const api = {
  async login(): Promise<{ access_token: string; refresh_token: string }> {
    return { access_token: "supabase-public", refresh_token: "" };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getMe(): Promise<User> {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    return {
      id: user?.id || "visitor",
      email: user?.email || "visitor@nan.local",
      displayName: user?.user_metadata?.display_name || "Nan Visitor",
      roles: ["visitor"],
      active: true,
      createdAt: user?.created_at || new Date().toISOString(),
    };
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
    let items = await allEntities();
    if (params.q) {
      const terms = params.q.toLocaleLowerCase("th").split(/\s+/).filter(Boolean);
      items = items.filter((entity) => {
        const haystack = [entity.nameTh, entity.nameEn, entity.description].filter(Boolean).join(" ").toLocaleLowerCase("th");
        return terms.some((term) => haystack.includes(term));
      });
    }
    if (params.labels?.length) {
      items = items.filter((entity) => params.labels!.some((label) => entity.labels.includes(label)));
    }
    if (params.theme) {
      const theme = params.theme.toLowerCase();
      items = items.filter((entity) => ((entity.properties.themes as string[] | undefined) || [])
        .some((value) => value.toLowerCase() === theme));
    }
    if (params.latitude !== undefined && params.longitude !== undefined && params.radius_meters !== undefined) {
      items = items
        .filter((entity) => entity.latitude != null && entity.longitude != null)
        .map((entity) => ({ entity, distance: distanceMeters(params.latitude!, params.longitude!, entity.latitude!, entity.longitude!) }))
        .filter(({ distance }) => distance <= params.radius_meters!)
        .sort((a, b) => a.distance - b.distance)
        .map(({ entity }) => entity);
    }
    return { items: items.slice(0, params.limit ?? 20) };
  },

  async getEntity(entityId: string): Promise<GraphEntity> {
    const { data, error } = await supabase.from("nan_graph_entities")
      .select("id,labels,name_th,name_en,description,latitude,longitude,visibility,properties")
      .eq("id", entityId).eq("visibility", "public").single();
    if (error || !data) fail(error?.message || "ไม่พบข้อมูล");
    return entityFromRow(data as EntityRow);
  },

  async getEntitySources(entityId: string): Promise<{ items: KnowledgeSource[] }> {
    const { data: links, error: linkError } = await supabase.from("nan_entity_sources")
      .select("source_id,role").eq("entity_id", entityId);
    if (linkError) fail(linkError.message);
    if (!links?.length) return { items: [] };
    const { data: sources, error } = await supabase.from("nan_sources")
      .select("id,title,url,publisher,source_type,accessed_at").in("id", links.map((link) => link.source_id));
    if (error) fail(error.message);
    const roles = new Map(links.map((link) => [link.source_id, link.role]));
    return { items: (sources || []).map((source) => ({ ...source, role: roles.get(source.id) || "reference" })) as KnowledgeSource[] };
  },

  async getEntityNeighbors(
    entityId: string,
    relationshipTypes?: string[],
    _depth = 1,
    limit = 20,
  ): Promise<{ items: { relationship: GraphRelationship; entity: GraphEntity }[] }> {
    void _depth;
    const { data, error } = await supabase.from("nan_graph_relationships")
      .select("source_id,type,target_id,properties")
      .or(`source_id.eq.${entityId},target_id.eq.${entityId}`);
    if (error) fail(error.message);
    const relationships = ((data || []) as GraphRelationship[])
      .filter((rel) => !relationshipTypes?.length || relationshipTypes.includes(rel.type)).slice(0, limit);
    const ids = relationships.map((rel) => rel.source_id === entityId ? rel.target_id : rel.source_id);
    if (!ids.length) return { items: [] };
    const { data: rows, error: entityError } = await supabase.from("nan_graph_entities")
      .select("id,labels,name_th,name_en,description,latitude,longitude,visibility,properties")
      .in("id", ids).eq("visibility", "public");
    if (entityError) fail(entityError.message);
    const entities = new Map(((rows || []) as EntityRow[]).map((row) => [row.id, entityFromRow(row)]));
    return { items: relationships.flatMap((relationship) => {
      const id = relationship.source_id === entityId ? relationship.target_id : relationship.source_id;
      const entity = entities.get(id);
      return entity ? [{ relationship, entity }] : [];
    }) };
  },

  async aiReason(body: ReasoningRequest): Promise<ReasoningResult> {
    const themeByKind: Record<string, string | undefined> = {
      experience: body.themes?.[0], community: undefined, transportation: undefined, season: undefined,
    };
    const entities = (await this.searchEntities({
      q: body.question,
      theme: themeByKind[body.kind],
      limit: body.limit || 5,
    })).items;
    const fallback = entities.length ? entities : (await this.searchEntities({
      labels: body.kind === "community" ? ["Community"] : undefined,
      limit: body.limit || 5,
    })).items;
    const selected = fallback.slice(0, body.limit || 5);
    const sourceGroups = await Promise.all(selected.map((entity) => this.getEntitySources(entity.id)));
    const citations = selected.flatMap((entity, index) => sourceGroups[index].items.slice(0, 1).map((source) => ({
      entity_id: entity.id, title: source.title, locator: source.url,
    })));
    const names = selected.map((entity) => entity.nameTh).join(", ");
    const summary = selected.length
      ? `จากองค์ความรู้ที่เชื่อมโยงใน Nan Living OS พบเรื่องที่เกี่ยวข้อง ได้แก่ ${names} ลองเริ่มจากเรื่องราวและชุมชน แล้วเลือกประสบการณ์ที่เหมาะกับช่วงเวลาและบริบทของคุณ`
      : "ยังไม่พบข้อมูลที่ตรงกับคำถามนี้ในคลังความรู้น่าน ลองใช้ชื่อชุมชน สถานที่ หรือหัวข้อวัฒนธรรมที่เฉพาะเจาะจงขึ้น";
    return {
      kind: body.kind,
      summary,
      items: selected.map((entity, index) => ({
        entity_id: entity.id,
        title: entity.nameTh,
        score: Math.max(0.5, 1 - index * 0.1),
        reasons: [entity.description || "ข้อมูลจากคลังความรู้ Nan Living OS"],
        evidence_ids: sourceGroups[index].items.map((source) => source.id),
      })),
      citations,
      assumptions: ["คำตอบสร้างจากข้อมูลสาธารณะที่มีแหล่งอ้างอิงใน Supabase"],
      model: "Nan Knowledge Decision Engine",
      grounded: citations.length > 0,
    };
  },

  async aiEnrich(text: string): Promise<unknown> {
    return { text, source: "supabase" };
  },

  async getRecommendations(params: { themes?: string[]; limit?: number }): Promise<{ items: { entity: GraphEntity; score: number; reasons: string[] }[] }> {
    const entities = (await this.searchEntities({ theme: params.themes?.[0], limit: params.limit || 10 })).items;
    return { items: entities.map((entity, index) => ({ entity, score: 1 - index * 0.05, reasons: ["ตรงกับความสนใจจากคลังความรู้"] })) };
  },

  async createCommunityPost(body: { title: string; body: string; language: string; visibility: string; related_entity_ids?: string[] }): Promise<CommunityPost> {
    const now = new Date().toISOString();
    const post: CommunityPost = {
      id: crypto.randomUUID(), author_id: "user-admin", title: body.title, body: body.body,
      language: body.language, visibility: body.visibility as CommunityPost["visibility"], status: "submitted",
      related_entity_ids: body.related_entity_ids || [], created_at: now, updated_at: now,
    };
    const { error } = await supabase.from("nan_community_posts").insert(post);
    if (error) fail(error.message);
    return post;
  },

  async listCommunityPosts(status?: string, limit = 20): Promise<{ items: CommunityPost[] }> {
    let query = supabase.from("nan_community_posts").select("*").order("created_at", { ascending: false }).limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) fail(error.message);
    return { items: (data || []) as CommunityPost[] };
  },

  async submitCommunityPost(postId: string): Promise<CommunityPost> {
    return { id: postId } as CommunityPost;
  },

  async moderateCommunityPost(_postId: string, _approve: boolean): Promise<CommunityPost> {
    void _postId;
    void _approve;
    throw new APIError("การอนุมัติเนื้อหาต้องทำผ่าน Supabase Dashboard โดยผู้ดูแล");
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [entities, posts] = await Promise.all([allEntities(), this.listCommunityPosts(undefined, 1000)]);
    const entityCounts: Record<string, number> = {};
    entities.forEach((entity) => entity.labels.forEach((label) => { entityCounts[label] = (entityCounts[label] || 0) + 1; }));
    const postCounts: Record<string, number> = {};
    posts.items.forEach((post) => { postCounts[post.status] = (postCounts[post.status] || 0) + 1; });
    return { users: 0, entities: entityCounts, posts: postCounts };
  },
};
