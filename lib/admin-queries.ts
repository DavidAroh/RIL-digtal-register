import { supabase } from './supabase'

export interface MemberWithStatus {
  id: string
  email: string
  name: string
  phone_number: string | null
  role: string | null
  category: 'staff' | 'understudy' | 'innovation_lab_user'
  is_active: boolean
  is_signed_in: boolean
  current_visit_id: string | null
  current_sign_in_time: string | null
  current_sign_out_time: string | null
  created_at: string
  otp_code: string | null
  otp_expires_at: string | null
  has_valid_otp: boolean
}

export interface SignedInMember {
  id: string
  name: string
  email: string
  category: string
  sign_in_time: string
  duration: string
}

export const fetchMembersWithStatus = async (): Promise<MemberWithStatus[]> => {
  try {
    const { data, error } = await supabase
      .from('members_with_status')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch members with status:', error)
    throw error
  }
}

export const fetchSignedInMembers = async (): Promise<SignedInMember[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_signed_in_members')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch signed in members:', error)
    throw error
  }
}

export const fetchLatestVisitLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('visit_logs')
      .select('member_id, sign_in_time, sign_out_time')
      .order('sign_in_time', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch visit logs:', error)
    throw error
  }
}

export const subscribeToVisitLogChanges = (callback: () => void) => {
  return supabase
    .channel('visit_logs_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'visit_logs'
      },
      callback
    )
    .subscribe()
}
