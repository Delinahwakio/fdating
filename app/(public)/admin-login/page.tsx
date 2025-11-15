'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  useEffect(() => {
    if (searchParams.get('setup') === 'complete') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [searchParams]);

  const checkSetup = async () => {
    try {
      const response = await fetch('/api/setup/check');
      const data = await response.json();

      if (data.needsSetup) {
        router.push('/setup');
        return;
      }
    } catch (error) {
      console.error('Error checking setup:', error);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F23]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F23]">
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/20 border border-green-500/50 backdrop-blur-md shadow-lg">
            <span className="text-xl">✓</span>
            <p className="text-sm text-white">
              Admin account created successfully! Please login.
            </p>
          </div>
        </div>
      )}
      <LoginForm
        title="Admin Login"
        role="admin"
        redirectPath="/admin/stats"
      />
    </div>
  );
}
