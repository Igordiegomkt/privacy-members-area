export interface NotificationWithStatus {
  id: string; // user_notification id
  notification_id: string;
  title: string;
  body: string;
  product_id: string | null;
  created_at: string;
  is_read: boolean;
  product_thumbnail?: string | null; // products.cover_thumbnail
  model_avatar_url?: string | null; // models.avatar_url
}