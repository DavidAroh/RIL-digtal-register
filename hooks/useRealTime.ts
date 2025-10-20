'use client';

import { useState, useEffect } from 'react';
import { getMembersWithStatus, getSignedInMembers, subscribeToVisitLogs, MemberWithStatus, SignedInMember } from '@/lib/admin-queries';

export const useRealTimeMembers = () => {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const data = await getMembersWithStatus();
        setMembers(data);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
    const subscription = subscribeToVisitLogs(() => void loadMembers());

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { members, isLoading };
};

export const useRealTimeSignedIn = () => {
  const [signedInMembers, setSignedInMembers] = useState<SignedInMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSignedInMembers = async () => {
      try {
        const data = await getSignedInMembers();
        setSignedInMembers(data);
      } catch (error) {
        console.error('Error loading signed in members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSignedInMembers();
    const subscription = subscribeToVisitLogs(() => void loadSignedInMembers());

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { signedInMembers, isLoading };
};

export const useRealTimeStats = () => {
  const { members } = useRealTimeMembers();
  const { signedInMembers } = useRealTimeSignedIn();

  return {
    totalMembers: members.length,
    activeMembers: members.filter(m => m.is_active).length,
    todaySignIns: signedInMembers.length,
    currentlySignedIn: members.filter(m => m.is_signed_in).length,
  };
};