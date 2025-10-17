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
  useRealTimeMembers,
  useRealTimeSignedIn,
  useRealTimeStats,
} from "@/hooks/useRealTime";
import { supabase, adminLogout } from "@/lib/supabase";
import { sendOTP } from "@/lib/member-auth";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const router = useRouter();
  const [logs, setLogs] = useState<NewUserState[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const { members, isLoading: membersLoading } = useRealTimeMembers();
  const { signedInMembers, isLoading: signedInLoading } = useRealTimeSignedIn();
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

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? members.filter((member) => {
          const hay =
            `${member.name} ${member.email} ${member.role || ''}`.toLowerCase();
          return hay.includes(normalizedQuery);
        })
      : members;

    return filtered.sort((a, b) => {
      if (a.is_signed_in !== b.is_signed_in) return a.is_signed_in ? -1 : 1;
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [members, query]);

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
      
      // Add member to Supabase
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert([{
          name: trimmed.name,
          email: trimmed.email,
          phone_number: trimmed.contact || null,
          role: trimmed.position || null,
          category: trimmed.department as 'staff' | 'understudy' | 'innovation_lab_user',
          is_active: true
        }])
        .select()
        .single();
      
      if (memberError) throw memberError;
      
      // Send OTP via Edge Function
      const result = await sendOTP(trimmed.email);
      const otp = result?.otp || result?.code || 'Sent';
      
      setMessage({
        type: "success",
        text: `User added successfully! OTP${otp !== 'Sent' ? `: ${otp}` : ''} sent to ${trimmed.email}`,
      });
      
      setNewUser({
        name: "",
        email: "",
        department: "",
        contact: "",
        position: "",
      });
      setIsAddUserOpen(false);
    } catch (error) {
      console.error('Error adding user:', error);
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
              className="h-[46px] rounded-lg"
              onClick={async () => {
                await adminLogout();
                router.push("/admin/login");
              }}
            >
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
          {members.length > 0 ? (
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
                    {rows.map((member, idx) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 px-4 text-gray-400 ">{idx + 1}</td>
                        <td className="py-3 px-4">{member.name}</td>
                        <td className="py-3 px-4">{member.email}</td>
                        <td className="py-3 px-4">{member.category}</td>
                        <td className="py-3 px-4">
                          {member.is_signed_in && member.current_sign_in_time
                            ? new Date(member.current_sign_in_time).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {member.current_sign_out_time
                            ? new Date(member.current_sign_out_time).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {member.is_signed_in ? (
                            <span className="text-green-600">In Office</span>
                          ) : member.current_sign_in_time ? (
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
