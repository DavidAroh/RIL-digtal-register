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
import Link from "next/link";
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
  RefreshCw,
  CheckCircle,
  XCircle,
  LogOut,
} from "lucide-react";
import {
  useRealTimeUsers,
  useRealTimeCheckIns,
  useRealTimeStats,
} from "@/hooks/useRealTime";
import { useAdminMembers, useSignedInMembers } from "@/hooks/useAdminData";
import {
  addUser,
  updateUser,
  generateOTP,
  User as UserType,
  CheckInRecord,
} from "@/lib/storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendOTPEmail } from "@/lib/emailService";
import { sendOTP as sendOTPService } from "@/lib/otp-service";
import ExistingUsers from "@/components/ExistingUsers";
import SecurityLogs from "@/components/SecurityLogs";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/lib/supabase";

// Types
type NewUserState = {
  name: string;
  email: string;
  department: string;
  contact: string;
  position: string;
};

type MessageState = {
  type: "success" | "error" | "";
  text: string;
};

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const { members, loading: membersLoading, error: membersError, refetch } = useAdminMembers();
  const { signedInMembers } = useSignedInMembers();

  const [logs, setLogs] = useState<NewUserState[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [todayVisitLogs, setTodayVisitLogs] = useState<any[]>([]);

  // Keep old hooks for backward compatibility (if needed)
  const users = useRealTimeUsers();
  const records = useRealTimeCheckIns();
  const stats = useRealTimeStats();

  // Fetch today's visit logs
  useEffect(() => {
    const fetchTodayVisitLogs = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('visit_logs')
        .select('*')
        .gte('sign_in_time', `${today}T00:00:00`)
        .order('sign_in_time', { ascending: false });

      if (!error && data) {
        setTodayVisitLogs(data);
      }
    };

    fetchTodayVisitLogs();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTodayVisitLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserState>({
    name: "",
    email: "",
    department: "",
    contact: "",
    position: "",
  });
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [message, setMessage] = useState<MessageState>({ type: "", text: "" });
  const [query, setQuery] = useState("");
  const [currentView, setCurrentView] = useState<"home" | "Users">("home");
  const [lastView, setLastView] = useState<"home" | "Logs">("home");

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayRecords = useMemo(
    () => records.filter((r) => r.date === today),
    [records, today]
  );

  const lastRecordByUser = useMemo(() => {
    const sorted = [...todayRecords].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const map = new Map<string, CheckInRecord>();
    sorted.forEach((r) => map.set(r.userId, r));
    return map;
  }, [todayRecords]);

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

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    // Use members from Supabase if available, otherwise fall back to localStorage users
    const dataSource = members.length > 0 ? members : users;

    const base = dataSource.map((u: any) => {
      const last = lastRecordByUser.get(u.id);
      const isPresent = presentUserIds.has(u.id) || (u.is_signed_in || false);

      // Get today's visit logs for this member
      const memberVisitLogs = todayVisitLogs.filter(log => log.member_id === u.id);
      const latestVisit = memberVisitLogs[0]; // Already sorted by sign_in_time desc

      return {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          department: u.category || u.department || u.role,
          isActive: u.is_active !== undefined ? u.is_active : u.isActive
        },
        isPresent,
        lastRecord: last,
        // Use visit logs data
        signInTime: latestVisit?.sign_in_time || u.current_sign_in_time || null,
        signOutTime: latestVisit?.sign_out_time || null,
        visitId: latestVisit?.id || u.current_visit_id || null
      };
    });

    const filtered = normalizedQuery
      ? base.filter(({ user }) => {
          const hay =
            `${user.name} ${user.email} ${user.department}`.toLowerCase();
          return hay.includes(normalizedQuery);
        })
      : base;

    return filtered.sort((a, b) => {
      if (a.isPresent !== b.isPresent) return a.isPresent ? -1 : 1;
      if (a.user.isActive !== b.user.isActive) return a.user.isActive ? -1 : 1;
      return a.user.name.localeCompare(b.user.name);
    });
  }, [members, users, lastRecordByUser, presentUserIds, query, todayVisitLogs]);

  const isFormValid =
    newUser.name.trim() !== "" &&
    newUser.email.trim() !== "" &&
    newUser.department.trim() !== "";

  const emailLooksValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAddUser = async () => {
    if (!isFormValid) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }
    if (!emailLooksValid(newUser.email)) {
      setMessage({ type: "error", text: "Enter a valid email address" });
      return;
    }
    setIsLoadingGlobal(true);
    try {
      // Validate category
      const validCategories = ['staff', 'understudy', 'innovation_lab_user'];
      const category = newUser.department.trim();

      if (!category || !validCategories.includes(category)) {
        throw new Error('Please select a valid role');
      }

      // Prepare member data
      const memberData = {
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        phone_number: newUser.contact.trim() || null,
        role: newUser.position.trim() || null,
        category: category,
        is_active: true,
      };

      // Add member to Supabase
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert(memberData)
        .select()
        .single();

      if (memberError) {
        console.error('Supabase error:', memberError);

        // Handle duplicate email error
        if (memberError.code === '23505') {
          throw new Error('This email is already registered. Please use a different email.');
        }

        throw new Error(memberError.message || 'Failed to add member to database');
      }

      if (!member) {
        throw new Error('No member data returned from database');
      }

      // Send OTP via EmailJS
      const otpResult = await sendOTPService(member.email, member.name);

      if (otpResult.success) {
        setMessage({
          type: "success",
          text: `Member registered successfully! OTP sent to ${member.email}`,
        });

        // Refresh members list
        refetch();
      } else {
        setMessage({
          type: "error",
          text: `Member registered but failed to send OTP: ${otpResult.error}`,
        });
      }

      // Reset form
      setNewUser({
        name: "",
        email: "",
        department: "",
        contact: "",
        position: "",
      });
      setIsAddUserOpen(false);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to register member"
      });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.email.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (currentView === "Users") {
    return <ExistingUsers />;
  }
  if (lastView === "Logs") {
    return <SecurityLogs />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <img src="/RIL logo.svg" alt="Logo" className="h-15 cursor-pointer" />
          </Link>
          <div className="flex items-center gap-3">
            <Button
              className="bg-blue-500 h-[46px] rounded-lg"
              onClick={() => setCurrentView("Users")}
            >
              Manage Existing Users
            </Button>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-50 hover:bg-blue-200 text-blue-500 w-[190px] h-[46px] text-[16px]">
                  Register New User
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
                  <Label htmlFor="name">Full Name *</Label>
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
                  <Label htmlFor="email">Email Address *</Label>
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
                  <Label htmlFor="department">Role *</Label>
                  <Select
                    value={newUser.department}
                    onValueChange={(value) =>
                      setNewUser({ ...newUser, department: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="understudy">Understudy</SelectItem>
                      <SelectItem value="innovation_lab_user">Innovation Lab User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newUser.position}
                    onChange={(e) =>
                      setNewUser({ ...newUser, position: e.target.value })
                    }
                    placeholder="e.g. Programs Manager, Visitor"
                  />
                </div>
                <Button
                  onClick={handleAddUser}
                  className="w-full"
                  disabled={isLoadingGlobal || !isFormValid}
                  aria-busy={isLoadingGlobal}
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
            <Button
              variant="outline"
              className="h-[46px] gap-2"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-[48px] rounded-lg text-md"
          />
        </div>

        {/* Daily Log */}
        <Card className="border-none shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daily Log</CardTitle>
              <CardDescription>See who's signed in today</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button className="bg-black text-white" size="sm">
                Export
              </Button>
            </div>
          </CardHeader>
          {membersLoading ? (
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading members...</span>
              </div>
            </CardContent>
          ) : rows.length > 0 ? (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="text-sm text-foreground border-b">
                      <th className="py-3 px-4 text-left">S/N</th>
                      <th className="py-3 px-4 text-left">Name</th>
                      <th className="py-3 px-4 text-left">Email Address</th>
                      <th className="py-3 px-4 text-left">Role</th>
                      <th className="py-3 px-4 text-left">Sign In Time</th>
                      <th className="py-3 px-4 text-left">Sign Out Time</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ user, isPresent, lastRecord, signInTime, signOutTime }, idx) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-3 px-4 text-gray-400 ">{idx + 1}</td>
                        <td className="py-3 px-4">{user.name}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{user.department}</td>
                        <td className="py-3 px-4">
                          {signInTime ? (
                            new Date(signInTime).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          ) : lastRecord?.action === "check-in" ? (
                            new Date(lastRecord.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {signOutTime ? (
                            new Date(signOutTime).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          ) : lastRecord?.action === "check-out" ? (
                            new Date(lastRecord.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isPresent ? (
                            <span className="text-green-600">In Office</span>
                          ) : signInTime || lastRecord ? (
                            "Complete"
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          ) : membersError ? (
            <CardContent>
              <div className="py-10 text-center text-sm text-red-500">
                <div className="flex flex-col items-center gap-3">
                  <XCircle className="w-12 h-12" />
                  <div>Error loading members: {membersError}</div>
                  <Button onClick={refetch} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="py-10 text-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <img src="/Social 02.svg" alt="No users registered yet." />
                  <div>No members registered yet. Click "Register New User" to add members.</div>
                </div>
              </div>
            </CardContent>
          )}

          <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
            <span>
              Showing {filteredLogs.length} of {logs.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
              <span className="px-2">…</span>
              <Button variant="outline" size="sm">
                Next ›
              </Button>
            </div>
          </div>
        </Card>

        {/* More Options */}
        <div className="mt-8 bg-">
          <h2 className="text-sm font-medium mb-2">More Options</h2>
          <div className="rounded-lg bg-blue-50 p-2">
            <Button
              variant="ghost"
              className="text-blue-600 p-0 ml-2"
              onClick={() => setLastView("Logs")}
            >
              Security Logs
            </Button>
            <p className="text-sm text-foreground ml-2 relative bottom-2 ">
              View Invalid OTP attempts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
