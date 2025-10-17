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
}

export interface SignedInMember {
  id: string
  name: string
  email: string
  category: string
  sign_in_time: string
  duration: string
}

// Get all members with their current status
export const getMembersWithStatus = async (): Promise<MemberWithStatus[]> => {
  const { data, error } = await supabase
    .from('members_with_status')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

// Get only currently signed-in members
export const getSignedInMembers = async (): Promise<SignedInMember[]> => {
  const { data, error } = await supabase
    .rpc('get_signed_in_members')
  
  if (error) throw error
  return data || []
}

// Get all members (with manual status check)
export const getAllMembersWithStatus = async () => {
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('*')
    .order('name')
  
  if (membersError) throw membersError
  
  // Get all open visit logs (currently signed in)
  const { data: openVisits, error: visitsError } = await supabase
    .from('visit_logs')
    .select('member_id, id, sign_in_time, sign_out_time')
    .is('sign_out_time', null)
  
  if (visitsError) throw visitsError
  
  // Get most recent completed visits (with sign-out time) for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data: recentVisits, error: recentError } = await supabase
    .from('visit_logs')
    .select('member_id, id, sign_in_time, sign_out_time')
    .not('sign_out_time', 'is', null)
    .gte('sign_in_time', today.toISOString())
    .order('sign_out_time', { ascending: false })
  
  if (recentError) throw recentError
  
  // Map members with their status
  return members.map(member => {
    const openVisit = openVisits?.find(v => v.member_id === member.id)
    const recentVisit = recentVisits?.find(v => v.member_id === member.id)
    
    return {
      ...member,
      is_signed_in: !!openVisit,
      current_visit_id: openVisit?.id || recentVisit?.id || null,
      current_sign_in_time: openVisit?.sign_in_time || recentVisit?.sign_in_time || null,
      current_sign_out_time: recentVisit?.sign_out_time || null
    }
  })
}

// Subscribe to real-time changes in visit logs
export const subscribeToVisitLogs = (callback: () => void) => {
  const subscription = supabase
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
  
  return subscription
}
