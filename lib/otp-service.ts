// lib/otp-service.ts
import { supabase } from './supabase'
import { sendOTPEmail, EmailData } from './emailService'

// Generate 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP in Supabase with expiration (10 minutes)
export const storeOTP = async (email: string, otp: string) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

  const { data, error } = await supabase
    .from('otp_codes')
    .upsert({
      email: email.toLowerCase(),
      code: otp,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    }, {
      onConflict: 'email'
    })
    .select()

  if (error) throw error
  return data
}

// Send OTP via EmailJS and store in Supabase
export const sendOTP = async (email: string, name: string) => {
  try {
    console.log('🔐 Starting OTP process for:', email)
    
    // Generate OTP
    const otp = generateOTP()
    console.log('✅ OTP generated:', otp)

    // Store in Supabase
    await storeOTP(email, otp)
    console.log('✅ OTP stored in database')

    // Send via EmailJS
    const emailData: EmailData = {
      to_email: email,
      to_name: name,
      otp_code: otp,
      company_name: "RIL Innovation Lab"
    }

    console.log('📧 Sending OTP via EmailJS...')
    const emailSent = await sendOTPEmail(emailData)

    if (!emailSent) {
      console.error('❌ EmailJS returned false')
      // Still return success since OTP is stored in database
      // User can check console for the OTP during development
      console.log('⚠️ OTP not sent via email, but stored in database. OTP:', otp)
      return { 
        success: true, 
        message: 'OTP generated and stored. Check console for OTP (email sending failed)',
        otp: otp // Include OTP in response for development
      }
    }

    console.log('✅ OTP sent successfully via EmailJS')
    return { success: true, message: 'OTP sent successfully' }
  } catch (error: any) {
    console.error('❌ Error in sendOTP:', error)
    return { success: false, error: error.message || 'Failed to send OTP' }
  }
}

// Verify OTP from Supabase
export const verifyOTP = async (email: string, otp: string) => {
  try {
    // Get the OTP from database
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', otp)
      .single()

    if (error || !data) {
      return { 
        valid: false, 
        message: 'Invalid OTP. Please check and try again.' 
      }
    }

    // Check if OTP is expired
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      // Delete expired OTP
      await supabase
        .from('otp_codes')
        .delete()
        .eq('email', email.toLowerCase())

      return { 
        valid: false, 
        message: 'OTP has expired. Please request a new one.' 
      }
    }

    // Delete used OTP
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email.toLowerCase())

    return { 
      valid: true, 
      message: 'OTP verified successfully' 
    }
  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    return { 
      valid: false, 
      error: error.message || 'Failed to verify OTP' 
    }
  }
}

// Resend OTP (generates new OTP and sends)
export const resendOTP = async (email: string, name: string) => {
  try {
    // Delete any existing OTP for this email
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email.toLowerCase())

    // Send new OTP
    return await sendOTP(email, name)
  } catch (error: any) {
    console.error('Error resending OTP:', error)
    return { success: false, error: error.message || 'Failed to resend OTP' }
  }
}

// Check if member exists in database
export const checkMemberExists = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, email, is_active')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) {
      return { exists: false, member: null }
    }

    if (!data.is_active) {
      return { 
        exists: false, 
        member: null,
        message: 'This account is inactive. Please contact admin.' 
      }
    }

    return { exists: true, member: data }
  } catch (error) {
    return { exists: false, member: null }
  }
}
