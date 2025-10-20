"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  UserPlus,
  RefreshCw,
  CheckCircle,
  Trash,
  Edit,
  ArrowLeft,
  Grid,
  List,
} from "lucide-react";
import { useRealTimeMembers } from "@/hooks/useRealTime";
import { supabase } from "@/lib/supabase";
import { sendOTP } from "@/lib/member-auth";
import { MemberWithStatus } from "@/lib/admin-queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminDashboard from "@/components/AdminDashboard";
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
  const { members } = useRealTimeMembers();

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
  const [otpDisplay, setOtpDisplay] = useState<{ [memberId: string]: string }>(
    {}
  );
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? members.filter((member) => {
          const searchText = `${member.name} ${member.email} ${member.role || ""} ${member.category}`.toLowerCase();
          return searchText.includes(normalizedQuery);
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
      const trimmed = {
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
      const otp = result?.otp_code || result?.otp || result?.code;
      
      // Display OTP on the newly created member's button
      if (otp && member?.id) {
        setOtpDisplay((prev) => ({ ...prev, [member.id]: otp }));
      }
      
      setMessage({
        type: "success",
        text: `User added successfully!${otp ? ` OTP: ${otp}` : ''} sent to ${trimmed.email}`,
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
      console.error("Error adding user:", error);
      setMessage({ type: "error", text: "Failed to add user" });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleRegenerateOTP = async (member: MemberWithStatus) => {
    setIsLoadingGlobal(true);
    try {
      // Send OTP via Supabase Edge Function
      const result = await sendOTP(member.email);
      
      // Extract OTP from response - Edge Function returns 'otp_code' field
      const newOTP = result?.otp_code || result?.otp || result?.code;
      
      if (newOTP) {
        // Display OTP on button
        setOtpDisplay((prev) => ({ ...prev, [member.id]: newOTP }));

        // Copy to clipboard automatically
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(newOTP);
            setCopiedUserId(member.id);
            setTimeout(() => setCopiedUserId(null), 2000);
          }
        } catch (clipboardError) {
          console.warn("Failed to copy to clipboard:", clipboardError);
        }

        setMessage({ 
          type: "success", 
          text: `OTP sent to ${member.email} - OTP: ${newOTP}` 
        });
      } else {
        setMessage({ 
          type: "error", 
          text: `OTP sent but not returned by server. Check email.` 
        });
      }
    } catch (error: any) {
      console.error("Error generating OTP:", error);
      setMessage({ 
        type: "error", 
        text: `Failed to send OTP: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleToggleUserStatus = async (
    memberId: string,
    currentStatus: boolean,
    memberName: string
  ) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_active: !currentStatus })
        .eq('id', memberId);
      
      if (error) throw error;
      
      setMessage({
        type: "success",
        text: `${memberName} ${
          currentStatus ? "deactivated" : "activated"
        } successfully`,
      });
    } catch (error) {
      console.error("Error toggling member status:", error);
      setMessage({
        type: "error",
        text: "Failed to update member status",
      });
    }
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const [currentView, setCurrentView] = useState<"home" | "Users" | "user">(
    "home"
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  if (currentView === "Users") {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <img src="/RIL logo.svg" alt="Company Logo" className="w-medium cursor-pointer" />
          </Link>

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
          
        </div>

        {message.text && (
          <Alert
            className={`mb-6 ${
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

        <div className="mb-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            onClick={() => setCurrentView("Users")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Search and View Toggle */}
        <div className="mb-4 flex gap-3 items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search users"
            className="h-[48px] rounded-lg text-md flex-1"
          />

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="px-3"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="px-3"
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* User Profile Cards */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          }
        >
          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500 col-span-full">
              <Image
                src="/Social 02.svg"
                alt="Empty state"
                width={100}
                height={100}
                className="mx-auto mb-3"
              />
              <p>
                {query
                  ? "No users found matching your search"
                  : "No users registered yet"}
              </p>
            </div>
          ) : (
            rows.map((member) =>
              viewMode === "list" ? (
                // List View - Horizontal Layout
                <Card
                  key={member.id}
                  className="flex items-center justify-between p-7 transition rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with initials */}
                    <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center text-gray-600 text-xl font-medium">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{member.name}</p>
                      <p className="text-blue-500 text-sm">
                        {member.role || "No position"}
                      </p>
                      <p className="text-gray-500 text-xs">{member.email}</p>
                    </div>
                  </div>

                  <div className="gap-28 grid grid-cols-3 text-sm">
                    <div className="text-center">
                      <p className="font-bold mb-1">Contact No</p>
                      <p>{member.phone_number || "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold mb-1">Role</p>
                      <p>{member.category || "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold mb-1">Status</p>
                      {member.is_signed_in ? (
                        <div className="text-green-600">In Office</div>
                      ) : (
                        <div>—</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="lg"
                      className="bg-blue-500 text-white hover:bg-blue-600"
                      onClick={() => handleRegenerateOTP(member)}
                      disabled={isLoadingGlobal}
                    >
                      {otpDisplay[member.id] ? (
                        copiedUserId === member.id ? (
                          <>Copied!</>
                        ) : (
                          `${otpDisplay[member.id]}`
                        )
                      ) : (
                        <>Generate OTP</>
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit user">
                      <Edit className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleToggleUserStatus(
                          member.id,
                          member.is_active,
                          member.name
                        )
                      }
                      title={
                        member.is_active ? "Deactivate user" : "Activate user"
                      }
                    >
                      {member.is_active ? (
                        <Trash className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                  </div>
                </Card>
              ) : (
                // Grid View - Vertical Card Layout
                <Card key={member.id} className="p-6 transition rounded-lg">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* User Info */}
                    <div className="w-full flex flex-row justify-between">
                      <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center text-gray-600 text-xl font-medium">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex flex-col text-left">
                        <h3 className="font-semibold text-lg mb-1">
                          {member.name}
                        </h3>
                        <p className="text-blue-500 text-sm mb-1">
                          {member.role || "No position"}
                        </p>
                        <p className="text-gray-500 text-sm mb-3">
                          {member.email}
                        </p>
                      </div>

                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost" title="Edit user">
                          <Edit className="w-6 h-6 text-gray-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            handleToggleUserStatus(
                              member.id,
                              member.is_active,
                              member.name
                            )
                          }
                          title={
                            member.is_active ? "Deactivate user" : "Activate user"
                          }
                        >
                          {member.is_active ? (
                            <Trash className="w-6 h-6 text-red-500" />
                          ) : (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="gap-20 grid grid-cols-3 text-sm">
                      <div className="text-center">
                        <p className="font-bold mb-1 w-20">Contact No</p>
                        <p>{member.phone_number || "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold mb-1">Role</p>
                        <p>{member.category || "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold mb-1">Status</p>
                        {member.is_signed_in ? (
                          <div className="text-green-600 w-20">In Office</div>
                        ) : (
                          <div>—</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full space-y-2">
                      <Button
                        className="w-full bg-blue-500 text-white hover:bg-blue-600"
                        onClick={() => handleRegenerateOTP(member)}
                        disabled={isLoadingGlobal}
                      >
                        {otpDisplay[member.id] ? (
                          copiedUserId === member.id ? (
                            <>Copied!</>
                          ) : (
                            `${otpDisplay[member.id]}`
                          )
                        ) : (
                          <>Generate OTP</>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
