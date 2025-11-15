'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/lib/utils/formatting'
import toast from 'react-hot-toast'

interface Transaction {
  id: string
  amount: number
  credits_purchased: number
  paystack_reference: string
  status: 'pending' | 'success' | 'failed'
  created_at: string
  completed_at: string | null
}

const CREDIT_PACKAGES = [
  { credits: 10, price: 100, label: '10 Credits', popular: false },
  { credits: 25, price: 250, label: '25 Credits', popular: true },
  { credits: 50, price: 500, label: '50 Credits', popular: false },
  { credits: 100, price: 1000, label: '100 Credits', popular: false }
]

export default function CreditsPage() {
  const { user } = useAuth()
  const [credits, setCredits] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[1])
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchCreditsAndTransactions()
    }
  }, [user])

  const fetchCreditsAndTransactions = async () => {
    try {
      setLoading(true)

      // Fetch current credit balance
      const { data: userData, error: userError } = await supabase
        .from('real_users')
        .select('credits')
        .eq('id', user?.id)
        .single()

      if (userError) throw userError
      setCredits(userData?.credits || 0)

      // Fetch transaction history
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('real_user_id', user?.id)
        .order('created_at', { ascending: false })

      if (transactionsError) throw transactionsError
      setTransactions(transactionsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = () => {
    if (typeof window === 'undefined' || !(window as any).PaystackPop) {
      toast.error('Payment system is loading. Please try again in a moment.')
      return
    }

    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user?.email,
      amount: selectedPackage.price * 100, // Convert to kobo
      currency: 'KES',
      ref: `${Date.now()}-${user?.id}`,
      metadata: {
        user_id: user?.id,
        credits: selectedPackage.credits
      },
      callback: async (response: any) => {
        try {
          // Verify payment on backend
          const result = await fetch('/api/webhooks/paystack/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reference: response.reference })
          })

          if (result.ok) {
            toast.success(`${selectedPackage.credits} credits added successfully!`)
            fetchCreditsAndTransactions() // Refresh data
          } else {
            const error = await result.json()
            toast.error(error.error || 'Payment verification failed')
          }
        } catch (error) {
          console.error('Payment verification error:', error)
          toast.error('Failed to verify payment')
        }
      },
      onClose: () => {
        toast('Payment cancelled', { icon: 'ℹ️' })
      }
    })

    handler.openIframe()
  }

  const filteredTransactions = transactions.filter(t => 
    statusFilter === 'all' ? true : t.status === statusFilter
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Credit Balance Section */}
      <GlassCard className="p-8 mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-50 mb-2">Your Credits</h1>
        <div className="text-6xl font-bold text-red-600 mb-4">{credits}</div>
        <p className="text-gray-300">
          Use credits to send messages beyond the first 3 free messages per chat
        </p>
      </GlassCard>

      {/* Credit Packages Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-50 mb-4">Purchase Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {CREDIT_PACKAGES.map(pkg => (
            <GlassCard
              key={pkg.credits}
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                selectedPackage.credits === pkg.credits
                  ? 'border-2 border-red-600 shadow-lg shadow-red-600/20'
                  : 'border border-gray-700'
              }`}
              onClick={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">
                  POPULAR
                </div>
              )}
              <div className="text-3xl font-bold text-gray-50 mb-2">{pkg.credits}</div>
              <div className="text-sm text-gray-400 mb-3">Credits</div>
              <div className="text-2xl font-bold text-red-600">KES {pkg.price}</div>
              <div className="text-xs text-gray-400 mt-1">
                KES {(pkg.price / pkg.credits).toFixed(1)} per credit
              </div>
            </GlassCard>
          ))}
        </div>
        <GlassButton
          onClick={handlePurchase}
          className="w-full md:w-auto px-8 py-3 text-lg"
        >
          Purchase {selectedPackage.credits} Credits for KES {selectedPackage.price}
        </GlassButton>
      </div>

      {/* Transaction History Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-50">Transaction History</h2>
          <div className="flex gap-2">
            {(['all', 'success', 'pending', 'failed'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-400">
              {statusFilter === 'all'
                ? 'No transactions yet. Purchase credits to get started!'
                : `No ${statusFilter} transactions found.`}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map(transaction => (
              <GlassCard key={transaction.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-bold text-gray-50">
                        {transaction.credits_purchased} Credits
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'success'
                            ? 'bg-green-600/20 text-green-400'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-600/20 text-yellow-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {transaction.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(transaction.created_at)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Ref: {transaction.paystack_reference}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-50">
                      KES {transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
