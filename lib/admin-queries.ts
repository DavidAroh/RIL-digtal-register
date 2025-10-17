// lib/admin-queries.ts
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
  console.log('📊 Fetching members from Supabase...')
  
  // Try to use the view first
  const { data: viewData, error: viewError } = await supabase
    .from('members_with_status')
    .select('*')
    .order('name')
  
  if (!viewError && viewData) {
    console.log('✅ Fetched from view:', viewData.length, 'members')
    return viewData
  }
  
  // Fallback: Query members table directly
  console.log('⚠️ View not available, querying members table directly')
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('*')
    .order('name')
  
  if (membersError) {
    console.error('❌ Error fetching members:', membersError)
    throw membersError
  }
  
  console.log('✅ Fetched from members table:', members?.length || 0, 'members')
  
  // Get open visits to determine sign-in status
  const { data: openVisits } = await supabase
    .from('visit_logs')
    .select('member_id, id, sign_in_time')
    .is('sign_out_time', null)
  
  // Map to expected format
  return (members || []).map(member => ({
    ...member,
    is_signed_in: openVisits?.some(v => v.member_id === member.id) || false,
    current_visit_id: openVisits?.find(v => v.member_id === member.id)?.id || null,
    current_sign_in_time: openVisits?.find(v => v.member_id === member.id)?.sign_in_time || null,
  })) as MemberWithStatus[]
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
  
  // Get all open visit logs
  const { data: openVisits, error: visitsError } = await supabase
    .from('visit_logs')
    .select('member_id, id, sign_in_time')
    .is('sign_out_time', null)
  
  if (visitsError) throw visitsError
  
  // Map members with their status
  return members.map(member => ({
    ...member,
    is_signed_in: openVisits?.some(v => v.member_id === member.id) || false,
    current_visit: openVisits?.find(v => v.member_id === member.id) || null
  }))
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
