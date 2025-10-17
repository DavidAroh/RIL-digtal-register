// hooks/useUserCheckIn.ts
import { useState } from 'react'
import { sendOTP, verifyOTP, resendOTP, checkMemberExists } from '@/lib/otp-service'
import { signInMember, signOutMember } from '@/lib/member-auth'

export interface UserSession {
  email: string
  name: string
  memberId: string
  isSignedIn: boolean
  visitId?: string
  signInTime?: string
}

export const useUserCheckIn = () => {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)

  // Load session from localStorage on mount
  const loadSession = () => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('user_checkin_session')
      if (storedSession) {
        try {
          setSession(JSON.parse(storedSession))
        } catch (err) {
          console.error('Failed to parse stored session', err)
          localStorage.removeItem('user_checkin_session')
        }
      }
    }
  }

  // Request OTP - Step 1
  const requestOTP = async (email: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Check if member exists
      const { exists, member, message } = await checkMemberExists(email)
      
      if (!exists || !member) {
        throw new Error(message || 'Email not found. Please contact admin to register.')
      }

      // Send OTP
      const result = await sendOTP(email, member.name)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP')
      }

      setOtpSent(true)
      return { success: true, memberName: member.name }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send OTP'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async (email: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { exists, member } = await checkMemberExists(email)
      
      if (!exists || !member) {
        throw new Error('Email not found')
      }

      const result = await resendOTP(email, member.name)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to resend OTP')
      }

      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend OTP'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP and Sign In - Step 2
  const verifyAndSignIn = async (email: string, otp: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Verify OTP
      const verifyResult = await verifyOTP(email, otp)
      
      if (!verifyResult.valid) {
        throw new Error(verifyResult.message || 'Invalid OTP')
      }

      // Sign in member (creates visit log)
      const signInResult = await signInMember(email)
      
      if (!signInResult) {
        throw new Error('Failed to sign in')
      }

      // Create session
      const userSession: UserSession = {
        email: email,
        name: signInResult.member_name,
        memberId: signInResult.member_id,
        isSignedIn: true,
        visitId: signInResult.id,
        signInTime: signInResult.sign_in_time
      }

      setSession(userSession)
      setOtpSent(false)
      
      // Store in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_checkin_session', JSON.stringify(userSession))
      }

      return { success: true, data: signInResult }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify OTP and sign in'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Sign Out
  const signOut = async () => {
    if (!session?.email) {
      setError('No active session')
      return { success: false, error: 'No active session' }
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await signOutMember(session.email)
      
      setSession(null)
      setOtpSent(false)
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_checkin_session')
      }

      return { success: true, data: result }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign out'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Clear error
  const clearError = () => setError(null)

  // Reset OTP state
  const resetOTPState = () => {
    setOtpSent(false)
    setError(null)
  }

  return {
    session,
    loading,
    error,
    otpSent,
    requestOTP,
    handleResendOTP,
    verifyAndSignIn,
    signOut,
    clearError,
    resetOTPState,
    loadSession
  }
}
