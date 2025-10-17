"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, User, UserCog, RefreshCw } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useUserCheckIn } from "@/hooks/useUserCheckIn";

export default function UserCheckIn() {
  const {
    session,
    loading,
    error,
    verifyAndSignIn,
    signOut: handleSignOut,
    clearError,
    loadSession
  } = useUserCheckIn();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadSession();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (error) {
      setMessage({ type: "error", text: error });
    }
  }, [error]);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
        clearError();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleEmailNext = () => {
    if (!email) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }
    setStep(2);
  };

  const handleLogin = async () => {
    if (!email || !otp) {
      setMessage({ type: "error", text: "Please enter OTP" });
      return;
    }

    const result = await verifyAndSignIn(email, otp);
    if (result.success) {
      setStep(3);
      setMessage({ type: "success", text: "Signed in successfully!" });
      setTimeout(() => {
        setStep(1);
      }, 2000);
      setEmail("");
      setOtp("");
    } else {
      setMessage({ type: "error", text: result.error || "Invalid OTP" });
    }
  };


  const handleCheckInOut = async () => {
    if (!session) return;

    if (session.isSignedIn) {
      // Check out
      const result = await handleSignOut();
      if (result.success) {
        setMessage({ type: "success", text: "Checked out successfully!" });
        // Update localStorage to reflect checked-out status locally (don't reload)
        if (typeof window !== 'undefined') {
          const updatedSession = {
            ...session,
            isSignedIn: false,
            signInTime: session.signInTime // Keep original sign-in time
          };
          localStorage.setItem('user_checkin_session', JSON.stringify(updatedSession));
        }
        // Force re-render by calling loadSession
        loadSession();
      } else {
        setMessage({ type: "error", text: result.error || "Check out failed" });
      }
    } else {
      // Check in - call sign in again
      const result = await verifyAndSignIn(session.email, "");
      if (result.success) {
        setMessage({ type: "success", text: "Checked in successfully!" });
        // Update session to reflect checked-in status
        loadSession();
      } else {
        setMessage({ type: "error", text: result.error || "Check in failed" });
      }
    }
  };


  const formatTime = (time: Date) =>
    time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Admin Link
      <div className="absolute top-4 right-4">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2">
            <UserCog className="w-4 h-4" />
            Admin
          </Button>
        </Link>
      </div> */}
      
      <div className="w-full max-w-sm flex justify-center">
        {!session ? (
          <Card className="shadow-none border-0">
            <CardHeader className="text-center space-y-1 mb-20 relative top-3">
              <img
                src="/RIL logo.svg"
                alt="Logo"
                className="mx-auto w-medium mb-2"
              />
              <CardTitle className="text-lg font-semibold text-blue-600">
                Welcome to the Office
              </CardTitle>
              <CardDescription>
                {step === 1 ? "Enter your email to continue" : "Enter the OTP from your registration email"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {message.text && (
                <p
                  className={`text-sm text-center ${
                    message.type === "error" ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {message.text}
                </p>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src="/bg-logo.svg"
                  alt="Background Logo"
                  className="w-[3666px] relative bottom-4"
                />
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="absolute top-4 left-4 flex items-center text-gray-00 hover:text-gray-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
              </div>
              {step === 1 && (
                <>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-12 rounded-4"
                  />
                  <Button 
                    onClick={handleEmailNext} 
                    className="w-[276px] h-12"
                  >
                    Next
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    className="mx-auto w-full"
                  >
                    <InputOTPGroup>
                      {[...Array(6)].map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="w-14 h-14 text-2xl text-blue-600"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  <Button
                    onClick={handleLogin}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Sign in"}
                  </Button>

                  <p className="text-sm text-gray-500 text-center">
                    Enter the OTP sent to your email during registration
                  </p>
                </>
              )}

              {step === 3 && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-blue-500 w-10 h-10" />
                    </div>
                  </div>
                  <p className="font-semibold text-gray-700">
                    Signed in successfully at
                  </p>
                  <p className="text-lg font-bold">{formatTime(currentTime)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">
                Welcome, {session.name}!
              </CardTitle>
              <CardDescription>{session.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Time */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-mono font-bold text-gray-800">
                  {formatTime(currentTime)}
                </div>
                {session.signInTime && (
                  <p className="text-sm text-gray-500 mt-2">
                    Signed in at {new Date(session.signInTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="text-center">
                {session.isSignedIn ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Checked In</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-full">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-medium">Checked Out</span>
                  </div>
                )}
              </div>

              {/* Check In / Check Out Button */}
              {session.isSignedIn ? (
                <Button
                  onClick={handleCheckInOut}
                  className="w-full bg-red-600 hover:bg-red-700 h-12 text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking out...
                    </>
                  ) : (
                    "Check Out"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckInOut}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    "Check In"
                  )}
                </Button>
              )}

              {/* Logout Button */}
              <Button
                onClick={() => {
                  // Clear session and reload
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('user_checkin_session');
                    window.location.reload();
                  }
                }}
                variant="outline"
                className="w-full h-12 text-base border-gray-300 hover:bg-gray-50"
              >
                Logout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
