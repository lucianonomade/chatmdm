import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const TRIAL_DAYS = 5;

interface TrialStatus {
  isLoading: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialStartedAt: Date | null;
}

export function useTrial(): TrialStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>({
    isLoading: true,
    isExpired: false,
    daysRemaining: TRIAL_DAYS,
    trialStartedAt: null,
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        isLoading: false,
        isExpired: false,
        daysRemaining: TRIAL_DAYS,
        trialStartedAt: null,
      });
      return;
    }

    const checkTrialStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('trial_started_at, trial_expired')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking trial status:', error);
          setStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (profile) {
          const trialStartedAt = profile.trial_started_at ? new Date(profile.trial_started_at) : new Date();
          const now = new Date();
          const diffTime = now.getTime() - trialStartedAt.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, TRIAL_DAYS - diffDays);
          const isExpired = profile.trial_expired || daysRemaining <= 0;

          // Update trial_expired in database if it just expired
          if (daysRemaining <= 0 && !profile.trial_expired) {
            await supabase
              .from('profiles')
              .update({ trial_expired: true })
              .eq('id', user.id);
          }

          setStatus({
            isLoading: false,
            isExpired,
            daysRemaining,
            trialStartedAt,
          });
        } else {
          setStatus({
            isLoading: false,
            isExpired: false,
            daysRemaining: TRIAL_DAYS,
            trialStartedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error in trial check:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkTrialStatus();
  }, [user]);

  return status;
}
