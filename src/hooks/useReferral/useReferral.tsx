import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { CreateReferralCodeRequest, ReferralStats } from '@/lib/referral/types'
import { useAppSelector } from '@/state/store'

import { createReferralCode, getReferralStatsByOwner } from '../../lib/referral/api'
import { selectWalletEnabledAccountIds } from '../../state/slices/common-selectors'
import { useFeatureFlag } from '../useFeatureFlag/useFeatureFlag'

export type UseReferralData = {
  referralStats: ReferralStats | null
  isLoadingReferralStats: boolean
  error: Error | null
  refetchReferralStats: () => void
  createCode: (request: Omit<CreateReferralCodeRequest, 'ownerAddress'>) => Promise<void>
  isCreatingCode: boolean
}

export const useReferral = (): UseReferralData => {
  const queryClient = useQueryClient()
  const walletEnabledAccountIds = useAppSelector(selectWalletEnabledAccountIds)
  const isWebServicesEnabled = useFeatureFlag('WebServices')

  // Use the first account ID (full CAIP format) as owner identifier
  // Backend will hash it for privacy
  const ownerAddress = useMemo(() => {
    if (walletEnabledAccountIds.length === 0) return null
    return walletEnabledAccountIds[0]
  }, [walletEnabledAccountIds])

  // Get current month date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }, [])

  const {
    data: referralStats,
    isLoading: isLoadingReferralStats,
    error,
    refetch: refetchReferralStats,
  } = useQuery({
    queryKey: ['referralStats', ownerAddress, startDate, endDate],
    queryFn:
      ownerAddress && isWebServicesEnabled
        ? () => getReferralStatsByOwner(ownerAddress, startDate, endDate)
        : skipToken,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  })

  const { mutateAsync: createCodeMutation, isPending: isCreatingCode } = useMutation({
    mutationFn: async (request: Omit<CreateReferralCodeRequest, 'ownerAddress'>) => {
      if (!ownerAddress) throw new Error('Wallet not connected')
      return createReferralCode({ ...request, ownerAddress })
    },
    onSuccess: () => {
      // Invalidate and refetch referral stats
      queryClient.invalidateQueries({ queryKey: ['referralStats', ownerAddress] })
    },
  })

  return {
    referralStats: referralStats ?? null,
    isLoadingReferralStats,
    error: error ?? null,
    refetchReferralStats,
    createCode: createCodeMutation,
    isCreatingCode,
  }
}
