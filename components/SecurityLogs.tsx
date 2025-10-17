"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Filter, Download } from "lucide-react";
import AdminDashboard from "@/components/AdminDashboard";
import ExistingUsers from "@/components/ExistingUsers";

interface SecurityLog {
  id: number;
  email: string;
  timestamp: string;
  status: string;
  attempts: number;
}

export default function SecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [existingView, setExistingView] = useState<"home" | "Existing">("home");

  useEffect(() => {
    // Fetch from API or DB later
    const fetchLogs = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000)); // simulate API delay
      setLogs([
        {
          id: 1,
          email: "shammahnei@gmail.com",
          timestamp: "2025-08-12 09:45",
          status: "Invalid OTP",
          attempts: 3,
        },
        {
          id: 2,
          email: "udemejonah@gmail.com",
          timestamp: "2025-08-12 09:42",
          status: "Invalid OTP",
          attempts: 1,
        },
      ]);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) =>
    log.email.toLowerCase().includes(query.toLowerCase())
  );
  const [currentView, setCurrentView] = useState<"home" | "Users" | "user">(
    "home"
  );

  if (currentView === "Users") {
    return <AdminDashboard />;
  }

  if (existingView === "Existing") {
    return <ExistingUsers />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <img src="/RIL logo.svg" alt="Logo" className="h-15 ml-4 cursor-pointer" />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Button
              className="bg-blue-500 h-[40px] rounded-lg text-white"
              onClick={() => setExistingView("Existing")}
            >
              Manage Existing Users
            </Button>
            <Button className="bg-blue-50 hover:bg-blue-200 text-blue-500 h-[40px] rounded-lg">
              Register New User
            </Button>
          </div>
        </div>

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

        {/* Page Title */}
        <div className="mb-4 flex flex-row gap-[72%]">
          <div>
            <h1 className="text-lg font-semibold">Security Logs</h1>
            <p className="text-sm text-gray-500">View invalid OTP attempts</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Filter className="w-4 h-4" /> Filter
            </Button>
            <Button size="sm" className="bg-black text-white">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
        </div>

        {/* Search + Filter + Export */}
        <div className="flex flex-col mb-6">
          <div className="mb-4 w-full h-[48px] rounded">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search users"
              className="h-[48px] rounded-lg text-md"
            />
          </div>
        </div>

        {/* Logs Table / Empty State */}
        <Card className="border-none shadow-none">
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading logs...</p>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <img
                  src="/empty-search.svg"
                  alt="No records"
                  className="w-32 h-32 mb-4"
                />
                <p className="text-gray-500">No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="text-sm text-gray-600 border-b">
                      <th className="py-3 px-4 text-left">S/N</th>
                      <th className="py-3 px-4 text-left">Date & Time</th>
                      <th className="py-3 px-4 text-left">User Email</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="border-b">
                        <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4">{log.timestamp}</td>
                        <td className="py-3 px-4">{log.email}</td>
                        <td className="py-3 px-4">{log.status}</td>
                        <td className="py-3 px-4 text-red-500 font-medium">
                          {log.attempts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
