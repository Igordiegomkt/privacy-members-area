export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string | null;
  title?: string | null;
  description?: string | null;
  subtitle?: string | null; // Novo campo
  cta?: string | null; // Novo campo
  tags?: string[] | null; // Novo campo
  model_id?: string | null;
  is_free?: boolean | null;
  created_at?: string;
  // Campos gerados por IA
  ai_title?: string | null;
  ai_subtitle?: string | null;
  ai_description?: string | null;
  ai_cta?: string | null;
  ai_tags?: string[] | null;
}

export type MediaAccessStatus = 'free' | 'unlocked' | 'locked';

export interface Model {
  id: string;
  name: string;
  username: string;
  bio?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  created_at: string;
  is_verified?: boolean;
}

export interface CreatorProfile {
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location?: string;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface FirstAccessRecord {
  id?: string;
  name: string;
  is_adult: boolean;
  ip_address: string;
  user_agent: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  referrer_domain?: string | null;
  landing_page?: string | null;
  device_type?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  created_at?: string;
}

export interface UserPresence {
  page: string;
  user: string;
  last_seen: string;
}

export interface PresenceState {
  [key: string]: UserPresence[];
}

export type ProductType = 'pack' | 'single_media' | 'subscription';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  type: ProductType;
  cover_thumbnail?: string;
  status: 'active' | 'inactive';
  created_at: string;
  model_id?: string;
  is_base_membership?: boolean;
}

// Novos tipos para joins
export interface JoinedModel {
  id: string;
  name: string;
  username: string;
}

export interface ProductWithModel extends Product {
  models: JoinedModel | null;
}

export interface ProductMedia {
  id: string;
  product_id: string;
  media_id: string;
  created_at: string;
}

export interface UserPurchase {
  id: string;
  user_id: string;
  product_id: string;
  price_paid_cents: number;
  status: 'paid' | 'pending' | 'failed';
  created_at: string;
}