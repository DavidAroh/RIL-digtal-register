// hooks/useSupabaseAuth.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { sendOTP, verifyOTP, signInMember, signOutMember } from '@/lib/member-auth'

export interface MemberSession {
  email: string
  name?: string
  isSignedIn: boolean
  visitId?: string
  signInTime?: string
}

export const useSupabaseAuth = () => {
  const [session, setSession] = useState<MemberSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Send OTP to email
  const requestOTP = async (email: string) => {
    setLoading(true)
    setError(null)
    try {
      await sendOTP(email)
      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send OTP'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP and sign in
  const verifyAndSignIn = async (email: string, otp: string) => {
    setLoading(true)
    setError(null)
    try {
      // First verify the OTP
      const verifyResult = await verifyOTP(email, otp)
      
      if (!verifyResult.valid) {
        throw new Error('Invalid OTP')
      }

      // Then sign in the member
      const signInResult = await signInMember(email)
      
      if (signInResult) {
        const memberSession: MemberSession = {
          email: email,
          name: signInResult.member_name,
          isSignedIn: true,
          visitId: signInResult.id,
          signInTime: signInResult.sign_in_time
        }
        setSession(memberSession)
        
        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('member_session', JSON.stringify(memberSession))
        }
        
        return { success: true, data: signInResult }
      }
      
      throw new Error('Sign in failed')
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify OTP and sign in'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Sign out member
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
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('member_session')
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

  // Load session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('member_session')
      if (storedSession) {
        try {
          setSession(JSON.parse(storedSession))
        } catch (err) {
          console.error('Failed to parse stored session', err)
          localStorage.removeItem('member_session')
        }
      }
    }
  }, [])

  return {
    session,
    loading,
    error,
    requestOTP,
    verifyAndSignIn,
    signOut,
    clearError: () => setError(null)
  }
}
