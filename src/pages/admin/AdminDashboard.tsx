import React, { useEffect, useState } from 'react';
import { DashboardCard } from '../../components/admin/DashboardCard';
import { AccessLogTable } from '../../components/admin/AccessLogTable';
import { RealtimeUsersWidget } from '../../components/admin/RealtimeUsersWidget';
import { AccessChart } from '../../components/admin/AccessChart';
import { supabase } from '../../lib/supabase';
import { FirstAccessRecord } from '../../types';

const REALTIME_CHANNEL = 'site-activity';

interface PresenceState {
  [key: string]: {
    page: string;
    user: string;
    last_seen: string;
  }[];
}

interface AccessByHour {
  hour: string;
  count: number;
}

export const AdminDashboard: React.FC = () => {
  const [totalAccessesToday, setTotalAccessesToday] = useState<number | string>('...');
  const [accessLogs, setAccessLogs] = useState<FirstAccessRecord[]>([]);
  const [presence, setPresence] = useState<PresenceState>({});
  const [accessesByHour, setAccessesByHour] = useState<AccessByHour[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDataForChart = (data: { hour: string; count: number }[]): AccessByHour[] => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourMap = new Map(data.map(item => [new Date(item.hour).getHours(), item.count]));
    
    return hours.map(hour => {
      const formattedHour = `${String(hour).padStart(2, '0')}:00`;
      return {
        hour: formattedHour,
        count: hourMap.get(hour) || 0,
      };
    });
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const countPromise = supabase
        .from('first_access')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      const logsPromise = supabase
        .from('first_access')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      const chartPromise = supabase.rpc('get_accesses_by_hour_today');

      const [countResult, logsResult, chartResult] = await Promise.all([countPromise, logsPromise, chartPromise]);

      if (countResult.error) console.error("Error fetching count:", countResult.error);
      else setTotalAccessesToday(countResult.count ?? 0);

      if (logsResult.error) console.error("Error fetching logs:", logsResult.error);
      else setAccessLogs(logsResult.data as FirstAccessRecord[]);
      
      if (chartResult.error) console.error("Error fetching chart data:", chartResult.error);
      else setAccessesByHour(formatDataForChart(chartResult.data));

      setLoading(false);
    };

    fetchInitialData();

    // Set up Supabase Realtime subscriptions
    const presenceChannel = supabase.channel(REALTIME_CHANNEL, {
      config: { presence: { key: `admin-${Date.now()}` } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState<PresenceState>();
        setPresence(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresence(prev => ({ ...prev, [key]: newPresences as any }));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresence(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      })
      .subscribe();

    const dbChangesChannel = supabase
      .channel('db-first_access-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'first_access' }, 
        (payload) => {
          const newRecord = payload.new as FirstAccessRecord;
          setAccessLogs(prev => [newRecord, ...prev.slice(0, 19)]);
          setTotalAccessesToday(prev => (typeof prev === 'number' ? prev + 1 : 1));
          
          // Update chart data
          const recordHour = new Date(newRecord.created_at!).getHours();
          setAccessesByHour(prev => {
            const newChartData = [...prev];
            const hourIndex = newChartData.findIndex(d => parseInt(d.hour.split(':')[0]) === recordHour);
            if (hourIndex > -1) {
              newChartData[hourIndex] = { ...newChartData[hourIndex], count: newChartData[hourIndex].count + 1 };
            }
            return newChartData;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(dbChangesChannel);
    };
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard em Tempo Real</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Acessos Hoje"
          value={loading ? '...' : totalAccessesToday}
          description="Total de acessos registrados hoje."
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <DashboardCard
          title="Usuários Online"
          value={Object.keys(presence).length}
          description="Usuários ativos no site neste momento."
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <RealtimeUsersWidget presence={presence} />
        <div className="bg-dark-light p-6 rounded-lg shadow-lg col-span-1">
           <h2 className="text-xl font-bold text-white mb-4">Últimos Acessos</h2>
           <AccessLogTable records={accessLogs} isLoading={loading} />
        </div>
      </div>
      
      <AccessChart data={accessesByHour} />
    </div>
  );
};