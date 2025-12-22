import { supabase } from './supabase'

export const sendOTPToEmail = async (email: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { email }
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to send OTP:', error)
    throw error
  }
}

export const verifyOTPCode = async (email: string, otp: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { email, otp }
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to verify OTP:', error)
    throw error
  }
}

export const performMemberSignIn = async (email: string) => {
  try {
    const signInTime = new Date().toISOString()

    // First, try the RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'sign_in_member_by_email',
      { p_email: email }
    )

    if (rpcError) {
      console.warn('RPC sign in failed, using direct insert:', rpcError)
      // Fallback: get member and create visit log directly
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .single()

      if (memberError) throw memberError

      const { data: visitLog, error: visitError } = await supabase
        .from('visit_logs')
        .insert([
          {
            member_id: memberData.id,
            sign_in_time: signInTime
          }
        ])
        .select()
        .single()

      if (visitError) throw visitError
      return visitLog
    }

    return rpcData?.[0]
  } catch (error) {
    console.error('Failed to sign in member:', error)
    throw error
  }
}

export const performMemberSignOut = async (email: string) => {
  try {
    const signOutTime = new Date().toISOString()

    // First, try the RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'sign_out_member_by_email',
      { p_email: email }
    )

    if (rpcError) {
      console.warn('RPC sign out failed, using direct update:', rpcError)
      // Fallback: get member and update the latest visit log
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .single()

      if (memberError) throw memberError

      const { data: visitLog, error: visitError } = await supabase
        .from('visit_logs')
        .update({ sign_out_time: signOutTime })
        .eq('member_id', memberData.id)
        .is('sign_out_time', null)
        .order('sign_in_time', { ascending: false })
        .limit(1)
        .select()
        .single()

      if (visitError) throw visitError
      return visitLog
    }

    return rpcData?.[0]
  } catch (error) {
    console.error('Failed to sign out member:', error)
    throw error
  }
}

export const createNewVisitLog = async (memberId: string) => {
  try {
    const { data, error } = await supabase
      .from('visit_logs')
      .insert([{ member_id: memberId }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to create visit log:', error)
    throw error
  }
}

export const completeVisitLog = async (visitLogId: string) => {
  try {
    const { data, error } = await supabase
      .from('visit_logs')
      .update({ sign_out_time: new Date().toISOString() })
      .eq('id', visitLogId)
      .is('sign_out_time', null)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to complete visit log:', error)
    throw error
  }
}
