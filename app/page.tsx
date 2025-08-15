'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  Shield, 
  Clock,
  UserCog,
  LogIn 
} from 'lucide-react';
import AdminDashboard from '@/components/AdminDashboard';
import UserCheckIn from '@/components/UserCheckIn';

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user'>('home');

  if (currentView === 'admin') {
    return <AdminDashboard />;
  }

  if (currentView === 'user') {
    return <UserCheckIn />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
                onClick={() => setCurrentView('user')}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Employee Check-in
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
                onClick={() => setCurrentView('admin')}
              >
                <UserCog className="w-5 h-5 mr-2" />
                Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}