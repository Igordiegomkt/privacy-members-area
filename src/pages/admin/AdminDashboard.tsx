import React, { useEffect, useState } from 'react';
import { DashboardCard } from '../../components/admin/DashboardCard';
import { supabase } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState<number | string>('...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      setLoading(true);
      const { count, error } = await supabase
        .from('first_access')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error("Error fetching user count:", error);
        setUserCount('Erro');
      } else {
        setUserCount(count ?? 0);
      }
      setLoading(false);
    };

    fetchUserCount();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Usuários Registrados"
          value={loading ? '...' : userCount}
          description="Total de usuários que acessaram o site."
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12a5.995 5.995 0 00-3-5.197M15 21a6 6 0 00-9-5.197" /></svg>
          }
        />
        {/* Add more cards here */}
      </div>
    </div>
  );
};