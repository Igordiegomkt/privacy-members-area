export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  thumbnail: string;
  url: string;
  title?: string;
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

// --- Marketplace Types ---

export interface Model {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
}

export interface Product {
  id: string;
  creator_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  type: string;
  status: string;
  cover_thumbnail: string | null;
  created_at: string;
  model_id: string | null;
  is_base_membership: boolean;
}

export interface UserPurchase {
  id: string;
  user_id: string;
  product_id: string;
  price_paid_cents: number; // From schema
  status: string;
  created_at: string;
  // Fields implied by the query result structure:
  amount_cents: number; 
  paid_at: string;
}

// Type definition reflecting the Supabase join structure:
// user_purchases -> products (array of products) -> models (array of models)
export type UserPurchaseWithProduct = Omit<UserPurchase, 'price_paid_cents'> & {
  amount_cents: number;
  paid_at: string;
  // O Supabase retorna joins como arrays, mesmo que esperemos um único item.
  products: (Product & { models: Model[] })[]; 
};