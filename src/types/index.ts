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

