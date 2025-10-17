'use client';

import { useState, useEffect } from 'react';
import { User, CheckInRecord, getUsers, getCheckInRecords } from '@/lib/storage';

export const useRealTimeUsers = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Initial load
    setUsers(getUsers());

    // Listen for updates
    const handleUsersUpdate = (event: CustomEvent) => {
      setUsers(event.detail);
    };

    window.addEventListener('usersUpdated', handleUsersUpdate as EventListener);
    
    return () => {
      window.removeEventListener('usersUpdated', handleUsersUpdate as EventListener);
    };
  }, []);

  return users;
};

export const useRealTimeCheckIns = () => {
  const [records, setRecords] = useState<CheckInRecord[]>([]);

  useEffect(() => {
    // Initial load
    setRecords(getCheckInRecords());

    // Listen for updates
    const handleCheckInUpdate = (event: CustomEvent) => {
      setRecords(event.detail);
    };

    window.addEventListener('checkInRecordsUpdated', handleCheckInUpdate as EventListener);
    
    return () => {
      window.removeEventListener('checkInRecordsUpdated', handleCheckInUpdate as EventListener);
    };
  }, []);

  return records;
};

export const useRealTimeStats = () => {
  const users = useRealTimeUsers();
  const records = useRealTimeCheckIns();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    todayCheckIns: 0,
    currentlyInOffice: 0,
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(record => record.date === today);
    
    // Calculate currently in office
    const userStatusMap = new Map<string, boolean>();
    todayRecords
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(record => {
        userStatusMap.set(record.userId, record.action === 'check-in');
      });
    
    const currentlyInOffice = Array.from(userStatusMap.values()).filter(Boolean).length;
    
    setStats({
      totalUsers: users.length,
      activeUsers: users.filter(user => user.isActive).length,
      todayCheckIns: todayRecords.filter(record => record.action === 'check-in').length,
      currentlyInOffice,
    });
  }, [users, records]);

  return stats;
};