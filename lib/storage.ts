export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  otp: string;
  isActive: boolean;
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: 'check-in' | 'check-out';
  timestamp: string;
  date: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  isCheckedIn: boolean;
  lastCheckIn?: string;
}

// Storage keys
const USERS_KEY = 'office_register_users';
const CHECKIN_RECORDS_KEY = 'office_register_checkins';
const USER_SESSION_KEY = 'office_register_session';

// Users management
export const getUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

export const saveUsers = (users: User[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent('usersUpdated', { detail: users }));
};

export const addUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
  const newUser: User = {
    ...user,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const users = getUsers();
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

export const updateUser = (id: string, updates: Partial<User>): void => {
  const users = getUsers();
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
  }
};

export const deleteUser = (id: string): void => {
  const users = getUsers();
  const filteredUsers = users.filter(user => user.id !== id);
  saveUsers(filteredUsers);
};

// Check-in records management
export const getCheckInRecords = (): CheckInRecord[] => {
  if (typeof window === 'undefined') return [];
  const records = localStorage.getItem(CHECKIN_RECORDS_KEY);
  return records ? JSON.parse(records) : [];
};

export const saveCheckInRecords = (records: CheckInRecord[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHECKIN_RECORDS_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent('checkInRecordsUpdated', { detail: records }));
};

export const addCheckInRecord = (record: Omit<CheckInRecord, 'id' | 'timestamp' | 'date'>): CheckInRecord => {
  const now = new Date();
  const newRecord: CheckInRecord = {
    ...record,
    id: generateId(),
    timestamp: now.toISOString(),
    date: now.toISOString().split('T')[0],
  };
  const records = getCheckInRecords();
  records.push(newRecord);
  saveCheckInRecords(records);
  return newRecord;
};

// Session management
export const getUserSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem(USER_SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

export const saveUserSession = (session: UserSession): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
};

export const clearUserSession = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_SESSION_KEY);
};

// Utility functions
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const validateOTP = (email: string, otp: string): User | null => {
  const users = getUsers();
  return users.find(user => user.email === email && user.otp === otp && user.isActive) || null;
};

export const getTodayRecords = (): CheckInRecord[] => {
  const today = new Date().toISOString().split('T')[0];
  return getCheckInRecords().filter(record => record.date === today);
};

export const getUserTodayStatus = (userId: string): { isCheckedIn: boolean; lastAction?: CheckInRecord } => {
  const todayRecords = getTodayRecords().filter(record => record.userId === userId);
  if (todayRecords.length === 0) {
    return { isCheckedIn: false };
  }
  
  const lastAction = todayRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return {
    isCheckedIn: lastAction.action === 'check-in',
    lastAction
  };
};