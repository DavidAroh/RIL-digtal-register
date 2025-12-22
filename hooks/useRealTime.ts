'use client'

import { useState, useEffect } from 'react'
import {
  fetchMembersWithStatus,
  fetchSignedInMembers,
  fetchLatestVisitLogs,
  subscribeToVisitLogChanges,
  MemberWithStatus,
  SignedInMember
} from '@/lib/admin-queries'
import { supabase } from '@/lib/supabase'

export const useRealTimeMembers = () => {
  const [members, setMembers] = useState<MemberWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoading(true)
        const [membersData, visitLogsData] = await Promise.all([
          fetchMembersWithStatus(),
          fetchLatestVisitLogs()
        ])

        // Create a map of latest visit logs by member_id
        const latestVisitsByMember = new Map<string, any>()
        visitLogsData.forEach((log: any) => {
          if (!latestVisitsByMember.has(log.member_id)) {
            latestVisitsByMember.set(log.member_id, log)
          }
        })

        // Merge visit log data with member data
        const enrichedMembers = membersData.map((member) => {
          const latestVisit = latestVisitsByMember.get(member.id)
          return {
            ...member,
            current_sign_in_time: latestVisit?.sign_in_time || member.current_sign_in_time,
            current_sign_out_time: latestVisit?.sign_out_time || member.current_sign_out_time
          }
        })

        setMembers(enrichedMembers)
        setError(null)
      } catch (err) {
        console.error('Error loading members:', err)
        setError(err instanceof Error ? err : new Error('Failed to load members'))
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()

    // Subscribe to visit_logs changes
    const visitLogsSubscription = subscribeToVisitLogChanges(() => {
      loadMembers()
    })

    // Subscribe to members table changes
    const membersSubscription = supabase
      .channel('members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members'
        },
        () => {
          loadMembers()
        }
      )
      .subscribe()

    return () => {
      visitLogsSubscription.unsubscribe()
      membersSubscription.unsubscribe()
    }
  }, [])

  return { members, isLoading, error }
}

export const useRealTimeSignedIn = () => {
  const [signedInMembers, setSignedInMembers] = useState<SignedInMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadSignedInMembers = async () => {
      try {
        setIsLoading(true)
        const data = await fetchSignedInMembers()
        setSignedInMembers(data)
        setError(null)
      } catch (err) {
        console.error('Error loading signed in members:', err)
        setError(err instanceof Error ? err : new Error('Failed to load signed in members'))
      } finally {
        setIsLoading(false)
      }
    }

    loadSignedInMembers()
    const subscription = subscribeToVisitLogChanges(() => {
      loadSignedInMembers()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { signedInMembers, isLoading, error }
}

export const useRealTimeStats = () => {
  const { members } = useRealTimeMembers()
  const { signedInMembers } = useRealTimeSignedIn()

  return {
    totalMembers: members.length,
    activeMembers: members.filter(m => m.is_active).length,
    todaySignIns: signedInMembers.length,
    currentlySignedIn: members.filter(m => m.is_signed_in).length
  }
}