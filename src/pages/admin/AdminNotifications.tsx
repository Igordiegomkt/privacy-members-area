import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Users, Eye, Search, Clock } from 'lucide-react';
import { NotificationWithStatus } from '../../types/notifications';

// Tipo estendido para incluir estatísticas
type NotificationWithStats = {
  id: string;
  title: string;
  body: string;
  product_id: string | null;
  created_at: string;
  totalUsers: number;
  totalRead: number;
};

// --- Componentes Auxiliares ---

const NotificationCard: React.FC<{ notification: NotificationWithStats }> = ({ notification }: { notification: NotificationWithStats }) => {
  const percentRead = notification.totalUsers > 0 ? Math.round((notification.totalRead / notification.totalUsers) * 100) : 0;
  const date = new Date(notification.created_at).toLocaleString('pt-BR');

  return (
    <div className="bg-privacy-surface border border-privacy-border/60 rounded-2xl p-4 flex flex-col gap-3 shadow-lg hover:border-primary/60 transition-colors">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-bold text-white line-clamp-2 flex-1 pr-4">
          {notification.title}
        </h2>
        <Bell className="w-5 h-5 text-primary" />
      </div>

      <p className="text-sm text-privacy-text-secondary line-clamp-3">
        {notification.body}
      </p>

      <div className="text-xs text-privacy-text-secondary flex items-center gap-2">
        <Clock className="w-3 h-3" />
        <span>{date}</span>
      </div>

      <div className="flex gap-3 pt-2 border-t border-privacy-border">
        <div className="flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-privacy-border/40 text-privacy-text-secondary">
          <Users className="w-3 h-3" />
          <span>{notification.totalUsers.toLocaleString()} usuários</span>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-privacy-border/40 text-privacy-text-secondary">
          <Eye className="w-3 h-3" />
          <span>{notification.totalRead.toLocaleString()} leram</span>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mt-2">
        <div className="w-full h-1.5 bg-privacy-border/40 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${percentRead}%` }}
          />
        </div>
        <p className="text-xs text-privacy-text-secondary/80">
          {percentRead}% dos usuários já viram essa notificação.
        </p>
      </div>
    </div>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="bg-privacy-surface border border-privacy-border/60 rounded-2xl p-4 flex flex-col gap-3 shadow-lg animate-pulse h-56">
    <div className="h-5 bg-privacy-border rounded w-3/4"></div>
    <div className="h-3 bg-privacy-border rounded w-full"></div>
    <div className="h-3 bg-privacy-border rounded w-5/6"></div>
    <div className="flex gap-3 pt-2 border-t border-privacy-border mt-auto">
      <div className="h-6 bg-privacy-border rounded-full w-1/3"></div>
      <div className="h-6 bg-privacy-border rounded-full w-1/4"></div>
    </div>
  </div>
);

// --- Lógica Principal ---

export const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', '7days', '30days'

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar todas as notificações globais
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('id, title, body, product_id, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (notifError) throw notifError;
      if (!notifData || notifData.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const notificationIds = notifData.map(n => n.id);

      // 2. Buscar estatísticas de leitura em user_notifications em uma única query
      // Nota: Esta query é complexa e pode ser lenta se houver milhões de user_notifications.
      // Para fins de demonstração e legibilidade, vamos buscar os dados e processar no front/Edge Function.
      // Como não temos uma EF para isso, vamos buscar todos os user_notifications relevantes e processar no front.
      
      // Alternativa: Buscar todas as user_notifications para os IDs e processar no front
      const { data: userNotifData, error: userNotifError } = await supabase
        .from('user_notifications')
        .select('notification_id, is_read')
        .in('notification_id', notificationIds);

      if (userNotifError) throw userNotifError;
      
      const statsMap = new Map<string, { totalUsers: number, totalRead: number }>();

      // Inicializa o mapa de estatísticas
      notificationIds.forEach(id => statsMap.set(id, { totalUsers: 0, totalRead: 0 }));

      // Processa os dados de user_notifications
      (userNotifData || []).forEach(un => {
        const stats = statsMap.get(un.notification_id);
        if (stats) {
          stats.totalUsers += 1;
          if (un.is_read) {
            stats.totalRead += 1;
          }
        }
      });

      // 3. Combinar dados
      const combined: NotificationWithStats[] = notifData.map(n => {
        const stats = statsMap.get(n.id) || { totalUsers: 0, totalRead: 0 };
        return {
          ...n,
          totalUsers: stats.totalUsers,
          totalRead: stats.totalRead,
        };
      });

      setNotifications(combined);
    } catch (err: any) {
      console.error('Error fetching admin notifications:', err);
      setError('Não foi possível carregar as notificações. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filterNotifications = (list: NotificationWithStats[]) => {
    let filtered = list;

    // 1. Filtrar por período
    const now = new Date();
    if (filterPeriod === '7days') {
      const sevenDaysAgo = now.setDate(now.getDate() - 7);
      filtered = filtered.filter(n => new Date(n.created_at).getTime() >= sevenDaysAgo);
    } else if (filterPeriod === '30days') {
      const thirtyDaysAgo = now.setDate(now.getDate() - 30);
      filtered = filtered.filter(n => new Date(n.created_at).getTime() >= thirtyDaysAgo);
    }

    // 2. Filtrar por termo de busca
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(lowerCaseSearch) ||
        n.body.toLowerCase().includes(lowerCaseSearch)
      );
    }

    return filtered;
  };

  const filteredNotifications = filterNotifications(notifications);

  const inputStyle = "w-full px-4 py-2 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Histórico de Notificações</h1>
      </div>

      {error && (
        <p className="text-red-400 bg-red-500/10 px-3 py-2 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* Toolbar de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-privacy-text-secondary" />
          <input
            type="text"
            placeholder="Buscar por título ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputStyle} pl-10`}
          />
        </div>
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className={`${inputStyle} sm:w-48`}
        >
          <option value="all">Todos os Períodos</option>
          <option value="7days">Últimos 7 dias</option>
          <option value="30days">Últimos 30 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 bg-privacy-surface rounded-xl border border-privacy-border">
          <Bell className="w-12 h-12 mx-auto text-privacy-text-secondary mb-4" />
          <p className="text-lg font-semibold text-white">Nenhuma notificação encontrada.</p>
          <p className="text-privacy-text-secondary text-sm mt-1">
            Ajuste os filtros ou envie uma nova notificação para que ela apareça aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredNotifications.map(n => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
};