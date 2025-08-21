"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  UserPlus,
  Activity,
  Clock,
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import {
  useRealTimeUsers,
  useRealTimeCheckIns,
  useRealTimeStats,
} from "@/hooks/useRealTime";
import {
  addUser,
  updateUser,
  generateOTP,
  User as UserType,
  CheckInRecord,
} from "@/lib/storage";
import { simulateEmailSend } from "@/lib/emailService";

export default function AdminDashboard() {
  const users = useRealTimeUsers();
  const records = useRealTimeCheckIns();
  const stats = useRealTimeStats();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    department: "",
    contact: "",
    position: "",
  });
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [query, setQuery] = useState("");

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayRecords = useMemo(
    () => records.filter((r) => r.date === today),
    [records, today]
  );

  // Map of userId -> last record (today)
  const lastRecordByUser = useMemo(() => {
    const sorted = [...todayRecords].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const map = new Map<string, CheckInRecord>();
    sorted.forEach((r) => map.set(r.userId, r));
    return map;
  }, [todayRecords]);

  // Set of present users based on today's events
  const presentUserIds = useMemo(() => {
    const sorted = [...todayRecords].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const present = new Set<string>();
    sorted.forEach((r) => {
      if (r.action === "check-in") present.add(r.userId);
      else present.delete(r.userId);
    });
    return present;
  }, [todayRecords]);

  // Merge user list with derived presence/activity data
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = users.map((u) => {
      const last = lastRecordByUser.get(u.id);
      const isPresent = presentUserIds.has(u.id);
      return {
        user: u,
        isPresent,
        lastRecord: last,
      };
    });

    const filtered = normalizedQuery
      ? base.filter(({ user }) => {
          const hay =
            `${user.name} ${user.email} ${user.department}`.toLowerCase();
          return hay.includes(normalizedQuery);
        })
      : base;

    // Sort: present first, then active, then by name
    return filtered.sort((a, b) => {
      if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
      if (a.user.isActive !== b.user.isActive) return a.user.isActive ? -1 : 1;
      return a.user.name.localeCompare(b.user.name);
    });
  }, [users, lastRecordByUser, presentUserIds, query]);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.department) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    setIsLoadingGlobal(true);
    try {
      const otp = generateOTP();
      const user = addUser({
        ...newUser,
        otp,
        isActive: true,
      });

      const emailSent = await simulateEmailSend({
        to_email: user.email,
        to_name: user.name,
        otp_code: otp,
        company_name: "Your Company",
      });

      if (emailSent) {
        setMessage({
          type: "success",
          text: `User added successfully! OTP sent to ${user.email}`,
        });
        setNewUser({
          name: "",
          email: "",
          department: "",
          contact: "",
          position: "",
        });
        setIsAddUserOpen(false);
      } else {
        setMessage({
          type: "error",
          text: "User added but failed to send OTP email",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add user" });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleRegenerateOTP = async (user: UserType) => {
    setIsLoadingGlobal(true);
    try {
      const newOTP = generateOTP();
      updateUser(user.id, { otp: newOTP });

      const emailSent = await simulateEmailSend({
        to_email: user.email,
        to_name: user.name,
        otp_code: newOTP,
        company_name: "Your Company",
      });

      if (emailSent) {
        setMessage({ type: "success", text: `New OTP sent to ${user.email}` });
      } else {
        setMessage({ type: "error", text: "Failed to send OTP email" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to regenerate OTP" });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUser(userId, { isActive: !currentStatus });
    setMessage({
      type: "success",
      text: `User ${currentStatus ? "deactivated" : "activated"} successfully`,
    });
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
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

            {/* Add user dialog */}
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
                    disabled={isLoadingGlobal}
                  >
                    {isLoadingGlobal ? (
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
        <div className="mb-4 w-full h-[48px]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search users"
          />
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

        {/* Unified Users + Activity Table */}
        <Card className="border-none">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Daily Log</CardTitle>
              <CardDescription>See who’s signed in today</CardDescription>
            </div>
            {/* <div className="w-full md:w-80">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, role or position..."
                aria-label="Search users"
              />
            </div> */}
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <img
                  src="/Social 02.svg"
                  alt="empty state"
                  className="mx-auto mb-3"
                />
                Looks like no one has signed in yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground border-b">
                      <th className="py-3 pr-4 font-medium">User</th>
                      <th className="py-3 px-4 font-medium">Email</th>
                      <th className="py-3 px-4 font-medium">Role</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Today</th>
                      <th className="py-3 px-4 font-medium">Last Activity</th>
                      <th className="py-3 px-4 font-medium">OTP</th>
                      <th className="py-3 pl-4 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ user, isPresent, lastRecord }) => (
                      <tr
                        key={user.id}
                        className={`border-b hover:bg-muted/30 transition ${
                          isPresent ? "" : ""
                        }`}
                      >
                        {/* User */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-medium leading-5">
                                {user.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.position || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm">{user.email}</div>
                        </td>

                        {/* Role / Department */}
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm text-gray-700">
                            {user.department || "—"}
                          </div>
                        </td>

                        {/* Active status */}
                        <td className="py-3 px-4 align-middle">
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Today presence */}
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isPresent ? "bg-green-100" : "bg-red-100"
                              }`}
                            >
                              {isPresent ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                              )}
                            </div>
                            <span className="text-sm">
                              {isPresent
                                ? "In Office"
                                : lastRecord
                                ? "Complete"
                                : "No activity"}
                            </span>
                          </div>
                        </td>

                        {/* Last activity */}
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm text-gray-600">
                            {lastRecord
                              ? `${formatTime(lastRecord.timestamp)}`
                              : "—"}
                          </div>
                        </td>

                        {/* OTP */}
                        <td className="py-3 px-4 align-middle">
                          <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                            {user.otp}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 pl-4 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegenerateOTP(user)}
                              disabled={isLoadingGlobal}
                            >
                              {/* <Mail className="w-4 h-4 mr-1" /> */}
                              Generate OTP
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                user.isActive ? "destructive" : "default"
                              }
                              onClick={() =>
                                handleToggleUserStatus(user.id, user.isActive)
                              }
                            >
                              {user.isActive ? (
                                <>
                                  <XCircle className="w-4 h-4" />
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rows.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No users match your search
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
