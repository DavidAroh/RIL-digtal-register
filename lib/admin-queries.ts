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
