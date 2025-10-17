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
import { CheckCircle, User, UserCog } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { sendOTP, verifyOTP, signInMember, signOutMember } from "@/lib/member-auth";

interface UserSession {
  email: string;
  name: string;
  isSignedIn: boolean;
  visitId?: string;
  signInTime?: string;
}

export default function UserCheckIn() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 3 = success confirmation screen
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionData = localStorage.getItem('user_session');
      if (sessionData) {
        setSession(JSON.parse(sessionData));
      }
    }
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleEmailNext = async () => {
    if (!email) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }
    setIsLoading(true);
    try {
      await sendOTP(email);
      setMessage({ type: "success", text: "OTP sent to your email" });
      setStep(2);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to send OTP" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !otp) {
      setMessage({ type: "error", text: "Please enter OTP" });
      return;
    }
    setIsLoading(true);
    try {
      // Verify OTP first
      const verifyResult = await verifyOTP(email, otp);
      
      if (verifyResult) {
        // Sign in the member
        const signInResult = await signInMember(email);
        
        const userSession: UserSession = {
          email: email,
          name: signInResult.member_name,
          isSignedIn: true,
          visitId: signInResult.id,
          signInTime: signInResult.sign_in_time,
        };
        
        // Save to localStorage for session persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_session', JSON.stringify(userSession));
        }
        
        setSession(userSession);
        setStep(3); // Show success confirmation screen
        setTimeout(() => {
          setStep(1); // Go back to main view
        }, 2000);
        setEmail("");
        setOtp("");
      } else {
        setMessage({ type: "error", text: "Invalid OTP" });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ type: "error", text: "Login failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      await signOutMember(session.email);
      
      const updatedSession = {
        ...session,
        isSignedIn: false,
      };
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_session', JSON.stringify(updatedSession));
      }
      
      setSession(updatedSession);
      setMessage({
        type: "success",
        text: "Successfully signed out!",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setMessage({ type: "error", text: "Sign out failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_session');
    }
    setSession(null);
    setStep(1);
    setMessage({ type: "success", text: "Logged out successfully" });
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
              <CardDescription>Let's get you signed in</CardDescription>
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
                  <Button onClick={handleEmailNext} className="w-[276px] h-12">
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
                  >
                    {isLoading ? "Verifying..." : "Sign in"}
                  </Button>
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
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">
                Welcome, {session.name}!
              </CardTitle>
              <CardDescription>{session.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-mono font-bold text-gray-800">
                  {formatTime(currentTime)}
                </div>
              </div>
              {session.isSignedIn && (
                <Button
                  onClick={handleSignOut}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing out..." : "Sign Out"}
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
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
