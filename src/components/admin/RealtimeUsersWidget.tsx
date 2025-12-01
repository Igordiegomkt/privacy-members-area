import React from 'react';
import { PresenceState } from '../../types';

interface RealtimeUsersWidgetProps {
  presence: PresenceState;
}

export const RealtimeUsersWidget: React.FC<RealtimeUsersWidgetProps> = ({ presence }) => {
  const onlineUsers = Object.values(presence).flatMap(p => p);
  const uniqueUsers = Array.from(new Map(onlineUsers.map(item => [item.user, item])).values())
    .sort((a, b) => a.user.localeCompare(b.user));

  return (
    <div className="bg-dark-light p-6 rounded-lg shadow-lg col-span-1 lg:col-span-2">
      <h2 className="text-xl font-bold text-white mb-4">
        Usuários Online Agora ({uniqueUsers.length})
      </h2>
      <div className="max-h-96 overflow-y-auto pr-2">
        {uniqueUsers.length > 0 ? (
          <ul className="space-y-3">
            {uniqueUsers.map((userState) => (
              <li key={userState.user} className="flex items-center justify-between p-3 bg-dark-lighter rounded-md">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="font-medium text-white">{userState.user}</span>
                </div>
                <span className="text-sm text-gray-400 bg-dark px-2 py-1 rounded">{userState.page}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500 py-8">Nenhum usuário online no momento.</p>
        )}
      </div>
    </div>
  );
};