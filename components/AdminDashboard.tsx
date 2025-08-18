"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  Filter,
  Download,
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
} from "@/lib/storage";
import { simulateEmailSend } from "@/lib/emailService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.department) {
      setMessage({ type: "error", text: "Please fill in all fields" });
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
      setIsLoading(false);
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <img src="/RIL logo.svg" alt="Logo" className="w-medium" />

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <Button variant="outline" className="shadow-sm relative left-[350px]">
              Manage Existing Users
            </Button>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          {/* Top Buttons */}
          <div className="flex justify-between items-center">
            <div className="space-x-2">
              <Button variant="outline" className="shadow-sm">
                Manage Existing Users
              </Button>
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register New User
              </Button>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" className="shadow-sm">
                <Filter className="w-4 h-4 mr-1" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="shadow-sm">
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
            </div>
          </div>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  Manage user accounts and OTP credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <img
                      src="/Social 02.svg"
                      alt="empty state"
                      className="mx-auto mb-3 opacity-80"
                    />
                    <p>Looks like no one has signed in yet</p>
                  </div>
                ) : (
                  <div className="rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>SN</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>OTP</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user, index) => (
                          <TableRow
                            key={user.id}
                            className={
                              index % 2 === 0
                                ? "bg-muted/30 hover:bg-muted/50 transition"
                                : "hover:bg-muted/50 transition"
                            }
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {user.name}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 rounded-md"
                              >
                                {user.department}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.isActive ? "default" : "outline"}
                                className="px-2 py-0.5 rounded-md"
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{user.otp}</span>
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-muted"
                                onClick={() => handleRegenerateOTP(user)}
                                disabled={isLoading}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Generate OTP
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  user.isActive ? "destructive" : "default"
                                }
                                className="hover:bg-muted"
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* More Options */}
            <div className="mt-4 flex justify-end">
              <Button variant="outline">More Options</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
