import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const REALTIME_CHANNEL = 'site-activity';

export const useRealtimeTracker = () => {
  const location = useLocation();
  const userName = localStorage.getItem('userName');

  useEffect(() => {
    if (!supabase || !userName) return;

    const channel = supabase.channel(REALTIME_CHANNEL, {
      config: {
        presence: {
          key: userName, // Use username as a unique key for presence
        },
      },
    });

    const trackActivity = () => {
      channel.track({
        page: location.pathname,
        user: userName,
        last_seen: new Date().toISOString(),
      });
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        // This is called when the client connects and gets the list of present users
        trackActivity();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Once subscribed, track the initial activity
          trackActivity();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location.pathname, userName]);
};