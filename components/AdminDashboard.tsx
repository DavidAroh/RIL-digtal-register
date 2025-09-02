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
import ExistingUsers from "@/components/ExistingUsers";
import SecurityLogs from "@/components/SecurityLogs";

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
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const users = useRealTimeUsers();
  const records = useRealTimeCheckIns();
  const stats = useRealTimeStats();

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
    const base = users.map((u) => {
      const last = lastRecordByUser.get(u.id);
      const isPresent = presentUserIds.has(u.id);
      return { user: u, isPresent, lastRecord: last };
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
  }, [users, lastRecordByUser, presentUserIds, query]);

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
      const trimmed: NewUserState = {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        department: newUser.department.trim(),
        contact: newUser.contact.trim(),
        position: newUser.position.trim(),
      };
      const otp = generateOTP();
      const user = addUser({ ...trimmed, otp, isActive: true });
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
          <img src="/RIL logo.svg" alt="Logo" className="h-15" />
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
                  {["name", "email", "contact", "department", "position"].map(
                    (field) => (
                      <div key={field}>
                        <Label htmlFor={field}>
                          {field === "department"
                            ? "Role"
                            : field.charAt(0).toUpperCase() + field.slice(1)}
                        </Label>
                        <Input
                          id={field}
                          type={field === "email" ? "email" : "text"}
                          value={newUser[field as keyof NewUserState]}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              [field]: e.target.value,
                            })
                          }
                          placeholder={
                            field === "email"
                              ? "john@company.com"
                              : `Enter ${field}`
                          }
                        />
                      </div>
                    )
                  )}
                  <Button
                    onClick={handleAddUser}
                    className="w-full"
                    disabled={isLoadingGlobal || !isFormValid}
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
              <CardDescription>See who’s signed in today</CardDescription>
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
          {users.length > 0 ? (
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
                    {rows.map(({ user, isPresent, lastRecord }, idx) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-3 px-4 text-gray-400 ">{idx + 1}</td>
                        <td className="py-3 px-4">{user.name}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{user.department}</td>
                        <td className="py-3 px-4">
                          {lastRecord?.action === "check-in"
                            ? new Date(lastRecord.timestamp).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {lastRecord?.action === "check-out"
                            ? new Date(lastRecord.timestamp).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {isPresent ? (
                            <span className="text-green-600">In Office</span>
                          ) : lastRecord ? (
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
          ) : (
            <CardContent>
              <div className="py-10 text-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <img src="/Social 02.svg" alt="No users registered yet." />
                  <div>Looks like no one has signed in yet</div>
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
