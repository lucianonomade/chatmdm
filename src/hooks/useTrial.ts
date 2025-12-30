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
        // 1. Fetch profile (trial data)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('trial_started_at, trial_expired, tenant_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking trial status:', profileError);
          setStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (!profile) {
          setStatus({
            isLoading: false,
            isExpired: false,
            daysRemaining: TRIAL_DAYS,
            trialStartedAt: new Date(),
          });
          return;
        }

        // 2. Fetch tenant subscription status
        const { data: tenant } = await supabase
          .from('tenants')
          .select('subscription_status, subscription_expires_at')
          .eq('id', profile.tenant_id)
          .maybeSingle();

        // 3. Check if subscription is active
        const hasActiveSubscription =
          tenant?.subscription_status === 'active' &&
          (!tenant.subscription_expires_at || new Date(tenant.subscription_expires_at) > new Date());

        // 4. Calculate trial status
        const trialStartedAt = profile.trial_started_at ? new Date(profile.trial_started_at) : new Date();
        const now = new Date();
        const diffTime = now.getTime() - trialStartedAt.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, TRIAL_DAYS - diffDays);
        const trialExpired = profile.trial_expired || daysRemaining <= 0;

        // 5. User is ONLY blocked if trial expired AND no active subscription
        const isExpired = trialExpired && !hasActiveSubscription;

        // 6. Update trial_expired in database if it just expired
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
      } catch (error) {
        console.error('Error in trial check:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkTrialStatus();
  }, [user]);

  return status;
}
