export type Role = "visitor" | "contributor" | "curator" | "admin";

export type Visibility = "public" | "community" | "restricted";

export type ContributionStatus = "draft" | "submitted" | "approved" | "rejected";

export type RecommendationKind = "experience" | "community" | "transportation" | "season";

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  active: boolean;
  createdAt: string;
}

export interface GraphEntity {
  id: string;
  labels: string[];
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  visibility: Visibility;
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  source_id: string;
  type: string;
  target_id: string;
  properties: Record<string, unknown>;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  source_type: string;
  role: string;
  accessed_at: string;
}

export interface Citation {
  entity_id: string;
  title: string;
  locator?: string | null;
}

export interface AIAnswer {
  answer: string;
  citations: Citation[];
  grounded: boolean;
  model: string;
}

export interface Recommendation {
  entity: GraphEntity;
  score: number;
  reasons: string[];
}

export interface ReasoningRequest {
  kind: RecommendationKind;
  question: string;
  language?: string;
  themes?: string[];
  activity_ids?: string[];
  start_entity_id?: string | null;
  destination_entity_ids?: string[];
  community_ids?: string[];
  transport_modes?: string[];
  accessibility_needs?: string[];
  travel_month?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  budget_level?: string | null;
  limit?: number;
}

export interface ReasonedItem {
  entity_id: string;
  title: string;
  score: number;
  reasons: string[];
  evidence_ids: string[];
  cautions?: string[];
}

export interface ReasoningResult {
  kind: RecommendationKind;
  summary: string;
  items: ReasonedItem[];
  citations: Citation[];
  assumptions: string[];
  model: string;
  grounded: boolean;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  language: string;
  visibility: Visibility;
  status: ContributionStatus;
  related_entity_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  users: number;
  entities: Record<string, number>;
  posts: Record<string, number>;
}
