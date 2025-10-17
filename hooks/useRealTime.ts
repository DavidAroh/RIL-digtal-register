'use client';

import { useState, useEffect } from 'react';
import { getAllMembersWithStatus, getSignedInMembers, subscribeToVisitLogs, MemberWithStatus, SignedInMember } from '@/lib/admin-queries';

export const useRealTimeMembers = () => {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadMembers = async () => {
      try {
        const data = await getAllMembersWithStatus();
        setMembers(data);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();

    // Subscribe to real-time changes
    const subscription = subscribeToVisitLogs(() => {
      loadMembers();
    });

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
    // Initial load
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

    // Subscribe to real-time changes
    const subscription = subscribeToVisitLogs(() => {
      loadSignedInMembers();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { signedInMembers, isLoading };
};

export const useRealTimeStats = () => {
  const { members } = useRealTimeMembers();
  const { signedInMembers } = useRealTimeSignedIn();
  
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todaySignIns: 0,
    currentlySignedIn: 0,
  });

  useEffect(() => {
    setStats({
      totalMembers: members.length,
      activeMembers: members.filter(m => m.is_active).length,
      todaySignIns: signedInMembers.length,
      currentlySignedIn: members.filter(m => m.is_signed_in).length,
    });
  }, [members, signedInMembers]);

  return stats;
};