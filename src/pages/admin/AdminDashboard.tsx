import * as React from 'react';
import { useEffect, useState } from 'react';
import { DashboardCard } from '../../components/admin/DashboardCard';
import { AccessLogTable } from '../../components/admin/AccessLogTable';
import { RealtimeUsersWidget } from '../../components/admin/RealtimeUsersWidget';
import { AccessChart } from '../../components/admin/AccessChart';
import { supabase } from '../../lib/supabase';
import { FirstAccessRecord, PresenceState, UserPresence } from '../../types';

const REALTIME_CHANNEL = 'site-activity';

interface AccessByHour {
  hour: string;
  count: number;
}

interface ModelSalesSummary {
  model_id: string;
  model_name: string;
  username: string;
  total_sales: number;
  total_revenue_cents: number;
}

interface SaleItem {
  id: string;
  created_at: string;
  paid_at?: string | null;
  amount_cents: number;
  product_name?: string;
  product_type?: string;
  model_name?: string | null;
  model_username?: string | null;
}

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const AdminDashboard: React.FC = () => {
  const [totalAccessesToday, setTotalAccessesToday] = useState<number | string>('...');
  const [totalAccessesLast7Days, setTotalAccessesLast7Days] = useState<number | string>('...');
  const [totalAccessesThisMonth, setTotalAccessesThisMonth] = useState<number | string>('...');
  const [accessLogs, setAccessLogs] = useState<FirstAccessRecord[]>([]);
  const [presence, setPresence] = useState<PresenceState>({});
  const [accessesByHour, setAccessesByHour] = useState<AccessByHour[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sales States
  const [loadingSales, setLoadingSales] = useState(true);
  const [modelSales, setModelSales] = useState<ModelSalesSummary[]>([]);
  const [salesList, setSalesList] = useState<SaleItem[]>([]);
  const [salesError, setSalesError] = useState<string | null>(null);


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
      
      // Calcula as datas exatamente como já era feito antes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      const firstDayOfMonthISO = firstDayOfMonth.toISOString();

      // Agora usamos:
      // - RPC para o gráfico por hora
      // - Edge Function para logs + contadores
      const [chartResult, logsInvokeResult] = await Promise.all([
        supabase.rpc('get_accesses_by_hour_today'),
        supabase.functions.invoke('get-access-logs', {
          body: {
            todayISO,
            sevenDaysAgoISO,
            firstDayOfMonthISO,
          },
        }),
      ]);

      // Trata resposta da Edge Function
      const logsError = logsInvokeResult.error;
      const logsData = logsInvokeResult.data as
        | { ok: boolean; logs?: FirstAccessRecord[]; totals?: { today: number; last7Days: number; month: number }; message?: string }
        | null;

      if (logsError) {
        console.error('[AdminDashboard] Error invoking get-access-logs:', logsError);
      } else if (!logsData || logsData.ok === false) {
        console.error(
          '[AdminDashboard] Error fetching logs/totals from get-access-logs:',
          logsData?.message || 'Unknown error',
        );
      } else {
        setAccessLogs(logsData.logs || []);
        setTotalAccessesToday(logsData.totals?.today ?? 0);
        setTotalAccessesLast7Days(logsData.totals?.last7Days ?? 0);
        setTotalAccessesThisMonth(logsData.totals?.month ?? 0);
      }

      // Trata resultado do gráfico (continua igual)
      if (chartResult.error) {
        console.error('Error fetching chart data:', chartResult.error);
      } else {
        setAccessesByHour(
          formatDataForChart(
            (chartResult.data as { hour: string; count: number }[]) || [],
          ),
        );
      }

      setLoading(false);
    };

    const loadSales = async () => {
      setLoadingSales(true);
      setSalesError(null);
      const { data, error } = await supabase.functions.invoke('get-sales-summary', {
        body: {},
      });

      if (error) {
        console.error('[AdminDashboard] get-sales-summary error:', error);
        setSalesError('Não foi possível carregar os dados de vendas.');
        setLoadingSales(false);
        return;
      }

      if (!data || data.ok === false) {
        console.error('[AdminDashboard] get-sales-summary data error:', data);
        setSalesError(data?.message || 'Falha ao carregar resumo de vendas.');
        setLoadingSales(false);
        return;
      }

      setModelSales(data.byModel || []);
      setSalesList(data.salesList || []);
      setLoadingSales(false);
    };

    fetchInitialData();
    loadSales();

    const channel = supabase.channel(REALTIME_CHANNEL);

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<UserPresence>();
        setPresence({ ...newState });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'first_access' },
        (payload) => {
          const newRecord = payload.new as FirstAccessRecord;

          // Atualiza tabela em tempo real
          setAccessLogs((prev) => [newRecord, ...prev.slice(0, 19)]);

          // Esses contadores agora são "otimistas" em cima do valor vindo da função
          setTotalAccessesToday((prev) =>
            typeof prev === 'number' ? prev + 1 : 1,
          );
          setTotalAccessesLast7Days((prev) =>
            typeof prev === 'number' ? prev + 1 : 1,
          );
          setTotalAccessesThisMonth((prev) =>
            typeof prev === 'number' ? prev + 1 : 1,
          );

          const recordHour = new Date(newRecord.created_at!).getHours();
          setAccessesByHour((prev) => {
            const newChartData = [...prev];
            const hourIndex = newChartData.findIndex(
              (d) => parseInt(d.hour.split(':')[0]) === recordHour,
            );
            if (hourIndex > -1) {
              newChartData[hourIndex] = {
                ...newChartData[hourIndex],
                count: newChartData[hourIndex].count + 1,
              };
            }
            return newChartData;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalRevenue = modelSales.reduce((sum, m) => sum + m.total_revenue_cents, 0);
  const totalSalesCount = modelSales.reduce((sum, m) => sum + m.total_sales, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard em Tempo Real</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Faturamento Total"
          value={loadingSales ? '...' : formatPrice(totalRevenue)}
          description="Receita total de vendas pagas."
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v10m0-10l-2.293-2.293a1 1 0 00-1.414 0l-2.293 2.293m6 0l2.293-2.293a1 1 0 011.414 0l2.293 2.293" /></svg>}
        />
        <DashboardCard
          title="Total de Vendas"
          value={loadingSales ? '...' : totalSalesCount}
          description="Número total de transações pagas."
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <DashboardCard
          title="Acessos Hoje"
          value={loading ? '...' : totalAccessesToday}
          description="Total de acessos registrados hoje."
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <DashboardCard
          title="Acessos 7 Dias"
          value={loading ? '...' : totalAccessesLast7Days}
          description={`Total de acessos nos últimos 7 dias. (Mês: ${totalAccessesThisMonth})`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
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

      {/* Sales Summary Section */}
      <section>
        <h2 className="text-xl font-bold text-white mb-3">
          Vendas por Modelo
        </h2>

        {loadingSales && (
          <p className="text-privacy-text-secondary">Carregando...</p>
        )}

        {salesError && (
          <p className="text-red-400 bg-red-500/10 p-3 rounded-md">
            {salesError}
          </p>
        )}

        {!loadingSales && !salesError && modelSales.length === 0 && (
          <p className="text-privacy-text-secondary">
            Ainda não há vendas registradas.
          </p>
        )}

        {!loadingSales && !salesError && modelSales.length > 0 && (
          <div className="bg-privacy-surface rounded-lg shadow-lg overflow-hidden">
            <table className="w-full text-sm text-left text-privacy-text-secondary">
              <thead className="bg-privacy-border text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Vendas</th>
                  <th className="px-4 py-2">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {modelSales.map((m) => (
                  <tr
                    key={m.model_id}
                    className="border-t border-privacy-border/60 hover:bg-privacy-border/50"
                  >
                    <td className="px-4 py-2 text-white">{m.model_name}</td>
                    <td className="px-4 py-2 text-privacy-text-secondary">
                      @{m.username}
                    </td>
                    <td className="px-4 py-2">{m.total_sales}</td>
                    <td className="px-4 py-2 font-semibold text-primary">
                      {formatPrice(m.total_revenue_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">
          Últimas vendas
        </h2>

        {loadingSales && (
          <p className="text-privacy-text-secondary">Carregando...</p>
        )}

        {!loadingSales && !salesError && salesList.length === 0 && (
          <p className="text-privacy-text-secondary">
            Nenhuma venda registrada ainda.
          </p>
        )}

        {!loadingSales && !salesError && salesList.length > 0 && (
          <div className="bg-privacy-surface rounded-lg shadow-lg overflow-hidden">
            <table className="w-full text-sm text-left text-privacy-text-secondary">
              <thead className="bg-privacy-border text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Produto</th>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {salesList.slice(0, 25).map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-privacy-border/60 hover:bg-privacy-border/50"
                  >
                    <td className="px-4 py-2 text-privacy-text-secondary">
                      {new Date(
                        s.paid_at ?? s.created_at,
                      ).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-white">
                      {s.product_name || '-'}
                    </td>
                    <td className="px-4 py-2 text-privacy-text-secondary">
                      {s.model_name ? `${s.model_name} (@${s.model_username})` : '-'}
                    </td>
                    <td className="px-4 py-2 text-privacy-text-secondary capitalize">
                      {s.product_type || '-'}
                    </td>
                    <td className="px-4 py-2 font-semibold text-primary">
                      {formatPrice(s.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};