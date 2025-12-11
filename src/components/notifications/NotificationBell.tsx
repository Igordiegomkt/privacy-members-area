import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { NotificationWithStatus } from '../../types/notifications';
import { Bell, X } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

interface NotificationBellProps {
  onNavigateToProduct: (productId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigateToProduct,
}: NotificationBellProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = React.useCallback(async (currentUserId: string) => {
    setLoading(true);

    // A query é robusta e deve retornar [] se não houver user_notifications para o ID.
    const { data, error } = await supabase
      .from('user_notifications')
      .select(`
        id,
        notification_id,
        is_read,
        created_at,
        notifications:notification_id (
          title,
          body,
          product_id,
          created_at,
          products:product_id (
            cover_thumbnail,
            model:model_id (
              avatar_url
            )
          )
        )
      `)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[NotificationBell] error fetching notifications:', error);
      setLoading(false);
      return;
    }

    const mapped: NotificationWithStatus[] =
      (data || []).map((row: any) => ({
        id: row.id,
        notification_id: row.notification_id,
        title: row.notifications?.title ?? 'Novo Conteúdo',
        body: row.notifications?.body ?? 'Clique para conferir.',
        product_id: row.notifications?.product_id ?? null,
        created_at: row.created_at,
        is_read: row.is_read,
        // Extract thumbnail (products.cover_thumbnail)
        product_thumbnail: row.notifications?.products?.cover_thumbnail ?? null,
        // Extract model avatar (products.model.avatar_url)
        model_avatar_url: row.notifications?.products?.model?.avatar_url ?? null,
      }));

    setNotifications(mapped);
    setLoading(false);
  }, []);

  // 1. Handle Auth State
  useEffect(() => {
    const updateUserId = (session: Session | null) => {
        setUserId(session?.user?.id ?? null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserId(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUserId(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch and Realtime Subscription
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    
    fetchNotifications(userId);

    const channel = supabase
      .channel(`user_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          // When a new user_notification is inserted, re-fetch the list
          // to get the full notification details (title, body, product_id) via JOIN.
          console.log('[NotificationBell] Realtime notification received, refetching...');
          fetchNotifications(userId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  // 3. Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif || notif.is_read) return;

    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('[NotificationBell] error marking as read:', error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      ),
    );
  };

  const handleClickNotification = (n: NotificationWithStatus) => {
    handleMarkAsRead(n.id);
    setOpen(false);

    if (n.product_id) {
      onNavigateToProduct(n.product_id);
    }
  };

  if (!userId) return null; // Renderiza apenas se houver userId

  return (
    <div className="relative" ref={bellRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full hover:bg-privacy-border/40 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-6 h-6 text-privacy-text-primary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-privacy-black text-[10px] px-1.5 py-0.5 rounded-full font-bold border-2 border-privacy-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-privacy-surface border border-privacy-border rounded-xl shadow-lg z-50">
          <div className="px-4 py-3 border-b border-privacy-border flex items-center justify-between">
            <span className="text-base font-semibold text-privacy-text-primary">
              Notificações
            </span>
            <button 
                onClick={() => setOpen(false)} 
                className="text-privacy-text-secondary hover:text-white"
                aria-label="Fechar"
            >
                <X size={18} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-hide">
            {loading && (
                <p className="px-4 py-4 text-sm text-privacy-text-secondary text-center">
                    Carregando...
                </p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="px-4 py-4 text-sm text-privacy-text-secondary">
                Nenhuma notificação por enquanto.
              </p>
            )}

            {notifications.map((n) => {
                // Lógica de fallback: product_thumbnail > model_avatar_url > fallback genérico
                const thumbSrc = n.product_thumbnail ?? n.model_avatar_url ?? '/video-fallback.svg';
                
                return (
                    <button
                        key={n.id}
                        onClick={() => handleClickNotification(n)}
                        className={`w-full text-left px-4 py-3 border-b border-privacy-border/40 text-sm transition-colors flex items-start gap-3 ${
                        n.is_read ? 'bg-transparent' : 'bg-primary/10 hover:bg-primary/20'
                        } hover:bg-privacy-border/60`}
                    >
                        <img 
                            src={thumbSrc} 
                            alt="Produto" 
                            className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                        />
                        <div className="flex flex-col gap-1 flex-1">
                            <p className="font-semibold text-privacy-text-primary">
                            {n.title}
                            </p>
                            <p className="text-xs text-privacy-text-secondary">
                            {n.body}
                            </p>
                            <p className="text-[10px] text-privacy-text-secondary/70 mt-1">
                                {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </button>
                );
            })}
          </div>
        </div>
      )}
    </div>
  );
};