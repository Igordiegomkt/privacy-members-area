import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const REALTIME_CHANNEL = 'site-activity';

export const useRealtimeTracker = () => {
  const location = useLocation();
  const userName = localStorage.getItem('userName');
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Efeito para criar e remover o canal (executa apenas uma vez)
  useEffect(() => {
    if (!supabase || !userName) return;

    const channel = supabase.channel(REALTIME_CHANNEL, {
      config: {
        presence: {
          key: userName,
        },
      },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Quando a inscrição for bem-sucedida, envie o primeiro status
        channel.track({
          page: location.pathname,
          user: userName,
          last_seen: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userName]); // Depende apenas do userName para criar o canal

  // Efeito para rastrear mudanças de página
  useEffect(() => {
    if (channelRef.current && channelRef.current.state === 'joined' && userName) {
      channelRef.current.track({
        page: location.pathname,
        user: userName,
        last_seen: new Date().toISOString(),
      });
    }
  }, [location.pathname, userName]); // Executa sempre que a localização muda
};