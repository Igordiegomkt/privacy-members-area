export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  thumbnail: string;
  url: string;
  title?: string;
  model_id?: string;
  is_free?: boolean;
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

// Types for Realtime Presence
export interface UserPresence {
  page: string;
  user: string;
  last_seen: string;
}

export interface PresenceState {
  [key: string]: UserPresence[];
}

// --- Marketplace & Model Types ---

export interface Model {
  id: string;
  name: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  created_at: string;
}

export type ProductType = 'pack' | 'single_media' | 'subscription';

export type MediaAccessStatus = 'free' | 'paid_locked' | 'paid_unlocked';

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