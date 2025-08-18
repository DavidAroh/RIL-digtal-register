'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Clock, 
  Mail, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  User,
  Building
} from 'lucide-react';
import { useRealTimeUsers, useRealTimeCheckIns, useRealTimeStats } from '@/hooks/useRealTime';
import { addUser, updateUser, deleteUser, generateOTP, User as UserType, CheckInRecord } from '@/lib/storage';
import { sendOTPEmail, simulateEmailSend } from '@/lib/emailService';

export default function AdminDashboard() {
  const users = useRealTimeUsers();
  const records = useRealTimeCheckIns();
  const stats = useRealTimeStats();
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    contact: '',
    position: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.department) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsLoading(true);
    try {
      const otp = generateOTP();
      const user = addUser({
        ...newUser,
        otp,
        isActive: true,
      });

      // Send OTP via email (using simulation for demo)
      const emailSent = await simulateEmailSend({
        to_email: user.email,
        to_name: user.name,
        otp_code: otp,
        company_name: 'Your Company',
      });

      if (emailSent) {
        setMessage({ type: 'success', text: `User added successfully! OTP sent to ${user.email}` });
        setNewUser({ name: '', email: '', department: '', contact: '', position:''});
        setIsAddUserOpen(false);
      } else {
        setMessage({ type: 'error', text: 'User added but failed to send OTP email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add user' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateOTP = async (user: UserType) => {
    setIsLoading(true);
    try {
      const newOTP = generateOTP();
      updateUser(user.id, { otp: newOTP });
      
      const emailSent = await simulateEmailSend({
        to_email: user.email,
        to_name: user.name,
        otp_code: newOTP,
        company_name: 'Your Company',
      });

      if (emailSent) {
        setMessage({ type: 'success', text: `New OTP sent to ${user.email}` });
      } else {
        setMessage({ type: 'error', text: 'Failed to send OTP email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to regenerate OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUser(userId, { isActive: !currentStatus });
    setMessage({ 
      type: 'success', 
      text: `User ${currentStatus ? 'deactivated' : 'activated'} successfully` 
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTodayRecords = () => {
    const today = new Date().toISOString().split('T')[0];
    return records.filter(record => record.date === today);
  };

  const getCurrentlyInOffice = () => {
    const todayRecords = getTodayRecords();
    const userStatusMap = new Map<string, { name: string, lastAction: CheckInRecord }>();
    
    todayRecords
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(record => {
        if (record.action === 'check-in') {
          userStatusMap.set(record.userId, { name: record.userName, lastAction: record });
        } else {
          userStatusMap.delete(record.userId);
        }
      });
    
    return Array.from(userStatusMap.values());
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-white-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <img src="/RIL logo.svg" alt="Logo" className="w-medium mb-2" />
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account and send OTP via email
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact No</Label>
                    <Input
                      id="contact"
                      value={newUser.contact}
                      onChange={(e) =>
                        setNewUser({ ...newUser, contact: e.target.value })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Role</Label>
                    <Input
                      id="department"
                      value={newUser.department}
                      onChange={(e) =>
                        setNewUser({ ...newUser, department: e.target.value })
                      }
                      placeholder="Select role"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={newUser.position}
                      onChange={(e) =>
                        setNewUser({ ...newUser, position: e.target.value })
                      }
                      placeholder="e.g Programs Manager, Visitor"
                    />
                  </div>
                  <Button
                    onClick={handleAddUser}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating User...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Register User & Send OTP
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {message.text && (
            <Alert
              className={`mt-4 ${
                message.type === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <AlertDescription
                className={
                  message.type === "error" ? "text-red-800" : "text-green-800"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Check-ins
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
              <p className="text-xs text-muted-foreground">Total for today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Currently In Office
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.currentlyInOffice}
              </div>
              <p className="text-xs text-muted-foreground">Present now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.activeUsers}
              </div>
              <p className="text-xs text-muted-foreground">Can check in</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="activity">Real-time Activity</TabsTrigger>
            <TabsTrigger value="present">Currently Present</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  Manage user accounts and OTP credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <img
                      src='/Social 02.svg'
                      alt='empty state'
                      className='mx-auto'
                      />
                      Looks like no one has signed in yet
                    </div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.department}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            OTP: {user.otp}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerateOTP(user)}
                            disabled={isLoading}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Generate OTP
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isActive ? "destructive" : "default"}
                            onClick={() =>
                              handleToggleUserStatus(user.id, user.isActive)
                            }
                          >
                            {user.isActive ? (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Today's Activity Log</CardTitle>
                <CardDescription>
                  Real-time check-in and check-out activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTodayRecords().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No activity today
                    </div>
                  ) : (
                    getTodayRecords()
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime()
                      )
                      .map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                record.action === "check-in"
                                  ? "bg-green-100"
                                  : "bg-red-100"
                              }`}
                            >
                              {record.action === "check-in" ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {record.userName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.userEmail}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                record.action === "check-in"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {record.action === "check-in"
                                ? "Checked In"
                                : "Checked Out"}
                            </Badge>
                            <div className="text-sm text-gray-500 mt-1">
                              {formatTime(record.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="present">
            <Card>
              <CardHeader>
                <CardTitle>Currently Present</CardTitle>
                <CardDescription>
                  Employees currently in the office
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getCurrentlyInOffice().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No one is currently checked in
                    </div>
                  ) : (
                    getCurrentlyInOffice().map((person, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">{person.name}</div>
                            <div className="text-sm text-gray-500">
                              Checked in at{" "}
                              {formatTime(person.lastAction.timestamp)}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-green-600 hover:bg-green-700">
                          Present
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
