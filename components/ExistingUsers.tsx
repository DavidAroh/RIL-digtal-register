"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { UserPlus, RefreshCw, CheckCircle, Trash, Edit, ArrowLeft } from "lucide-react";
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
import AdminDashboard from '@/components/AdminDashboard';
import Image from "next/image";

// Local types
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

export default function ExistingUsers() {
  const users = useRealTimeUsers();
  const records = useRealTimeCheckIns();
  useRealTimeStats();
  const router = useRouter();

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
  const [otpDisplay, setOtpDisplay] = useState<{ [userId: string]: string }>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

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

    // Fixed: Re-enabled search functionality
    const filtered = normalizedQuery
      ? base.filter(({ user }) => {
          const searchText = `${user.name} ${user.email} ${user.department} ${(user as any).position || ''}`.toLowerCase();
          return searchText.includes(normalizedQuery);
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
      const trimmed = {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        department: newUser.department.trim(),
        contact: newUser.contact.trim(),
        position: newUser.position.trim(),
      };

      const otp = generateOTP();
      const user = addUser({ 
        name: trimmed.name,
        email: trimmed.email,
        department: trimmed.department,
        otp, 
        isActive: true,
        // Add extra properties that might not be in the User type
        ...(trimmed.contact && { contact: trimmed.contact }),
        ...(trimmed.position && { position: trimmed.position })
      } as any);

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
    } catch (error) {
      console.error("Error adding user:", error);
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
      setOtpDisplay((prev) => ({ ...prev, [user.id]: newOTP }));

      // Fixed: Add clipboard API check and error handling
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(newOTP);
          setCopiedUserId(user.id);
          setTimeout(() => setCopiedUserId(null), 2000);
        }
      } catch (clipboardError) {
        console.warn("Failed to copy to clipboard:", clipboardError);
        // Continue without clipboard functionality
      }

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
    } catch (error) {
      console.error("Error regenerating OTP:", error);
      setMessage({ type: "error", text: "Failed to regenerate OTP" });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleToggleUserStatus = (
    userId: string,
    currentStatus: boolean,
    userName: string
  ) => {
    try {
      updateUser(userId, { isActive: !currentStatus });
      setMessage({
        type: "success",
        text: `${userName} ${currentStatus ? "deactivated" : "activated"} successfully`,
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      setMessage({
        type: "error",
        text: "Failed to update user status",
      });
    }
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const [currentView, setCurrentView] = useState<'home' | 'Users' | 'user'>('home');

  if (currentView === 'Users') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <img
            src="/RIL logo.svg" 
            alt="Company Logo" 
            className="w-medium"
          />

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
        </div>

        {message.text && (
          <Alert
            className={`mb-6 ${message.type === "error"
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

        <div className="mb-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            onClick={() => setCurrentView('Users')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4 w-full h-[48px] rounded">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search users"
            className="h-[48px] rounded-lg text-md"
          />
        </div>

        {/* User Profile Cards */}
        <div className="space-y-4">
          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Image
                src="/Social 02.svg"
                alt="Empty state"
                width={100}
                height={100}
                className="mx-auto mb-3"
              />
              <p>{query ? "No users found matching your search" : "No users registered yet"}</p>
            </div>
          ) : (
            rows.map(({ user, isPresent }) => (
              <Card
                key={user.id}
                className="flex items-center justify-between p-7 transition rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with initials */}
                  <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center text-gray-600 text-xl font-medium">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user.name}</p>
                    <p className="text-blue-500 text-sm">{(user as any).position || "No position"}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                </div>

                <div className="gap-28 grid grid-cols-3 text-sm">
                  <div className="text-center">
                    <p className="font-bold mb-1">Contact No</p>
                    <p>{(user as any).contact || "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-1">Role</p>
                    <p>{user.department || "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-1">Status</p>
                    {isPresent ? (
                      <div className="text-green-800">
                        In Office
                      </div>
                    ) : (
                      <div>
                        —
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    className="bg-blue-500 text-white hover:bg-blue-600"
                    onClick={() => handleRegenerateOTP(user)}
                    disabled={isLoadingGlobal}
                  >
                    {otpDisplay[user.id] ? (
                      copiedUserId === user.id ? (
                        <>
                          Copied!
                        </>
                      ) : (
                        `OTP: ${otpDisplay[user.id]}`
                      )
                    ) : (
                      <>
                        Generate OTP
                      </>
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" title="Edit user">
                    <Edit className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      handleToggleUserStatus(user.id, user.isActive, user.name)
                    }
                    title={user.isActive ? "Deactivate user" : "Activate user"}
                  >
                    {user.isActive ? (
                      <Trash className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}