// hooks/useAdminAuth.ts
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, adminLogin, adminLogout, isAuthenticated } from '@/lib/supabase'

export const useAdminAuth = () => {
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check initial auth state
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuth(!!session)
        setUser(session?.user || null)
        
        if (event === 'SIGNED_OUT') {
          router.push('/admin/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated()
      setIsAuth(authenticated)
      
      if (authenticated) {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setIsAuth(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const data = await adminLogin(email, password)
      setIsAuth(true)
      setUser(data.user)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    try {
      await adminLogout()
      setIsAuth(false)
      setUser(null)
      router.push('/admin/login')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  return {
    isAuth,
    loading,
    user,
    login,
    logout,
    checkAuth
  }
}
