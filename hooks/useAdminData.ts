// hooks/useAdminData.ts
import { useState, useEffect, useCallback } from 'react'
import { 
  getMembersWithStatus, 
  getSignedInMembers, 
  getAllMembersWithStatus,
  subscribeToVisitLogs,
  MemberWithStatus,
  SignedInMember
} from '@/lib/admin-queries'

export const useAdminMembers = () => {
  const [members, setMembers] = useState<MemberWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getMembersWithStatus()
      setMembers(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()

    // Subscribe to real-time updates
    const subscription = subscribeToVisitLogs(() => {
      fetchMembers()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchMembers])

  return { members, loading, error, refetch: fetchMembers }
}

export const useSignedInMembers = () => {
  const [signedInMembers, setSignedInMembers] = useState<SignedInMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSignedInMembers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getSignedInMembers()
      setSignedInMembers(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch signed-in members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSignedInMembers()

    // Subscribe to real-time updates
    const subscription = subscribeToVisitLogs(() => {
      fetchSignedInMembers()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchSignedInMembers])

  return { signedInMembers, loading, error, refetch: fetchSignedInMembers }
}

export const useAllMembersWithStatus = () => {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllMembersWithStatus()
      setMembers(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch members with status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()

    // Subscribe to real-time updates
    const subscription = subscribeToVisitLogs(() => {
      fetchMembers()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchMembers])

  return { members, loading, error, refetch: fetchMembers }
}
