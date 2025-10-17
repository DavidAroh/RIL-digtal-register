import { supabase } from './supabase'

export const sendOTP = async (email: string) => {
  // Send OTP
  const { data, error } = await supabase.functions.invoke('send-otp', {
    body: { email }
  })
  
  if (error) throw error
  return data
}

export const verifyOTP = async (email: string, otp: string) => {
  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: { email, otp }
  })
  
  if (error) throw error
  return data
}

export const signInMember = async (email: string) => {
  const { data, error } = await supabase.rpc('sign_in_member_by_email', {
    p_email: email
  })
  
  if (error) throw error
  return data[0] // Returns { id, member_id, member_name, sign_in_time, ... }
}

export const signOutMember = async (email: string) => {
  const { data, error } = await supabase.rpc('sign_out_member_by_email', {
    p_email: email
  })
  
  if (error) throw error
  return data[0] // Returns { id, member_id, member_name, sign_in_time, sign_out_time, duration }
}

// Legacy functions kept for backward compatibility
export const createVisitLog = async (memberId: string) => {
  const { data, error } = await supabase
    .from('visit_logs')
    .insert([{ member_id: memberId }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const signOut = async (visitLogId: string) => {
  const { data, error } = await supabase
    .from('visit_logs')
    .update({ sign_out_time: new Date().toISOString() })
    .eq('id', visitLogId)
    .is('sign_out_time', null)
    .select()
    .single()
  
  if (error) throw error
  return data
}
