import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { postJson } from '../lib/api'
import { AFFILIATE_URL } from '../lib/constants'
import { affiliateConfigQueryKey } from './useAffiliateConfig'

export interface ActionMessage {
  type: 'success' | 'error'
  text: string
}

interface UseAffiliateActionsArgs {
  affiliateAddress: string
  authHeaders: Record<string, string>
}

interface UseAffiliateActionsReturn {
  isLoading: boolean
  message: ActionMessage | null
  setMessage: (message: ActionMessage | null) => void
  clearMessage: () => void
  register: (bps: number) => void
  claimCode: (code: string) => Promise<void>
  updateBps: (bps: number) => Promise<void>
  updateReceiveAddress: (address: string) => Promise<void>
}

export const useAffiliateActions = ({
  affiliateAddress,
  authHeaders,
}: UseAffiliateActionsArgs): UseAffiliateActionsReturn => {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<ActionMessage | null>(null)

  const clearMessage = useCallback(() => setMessage(null), [])

  const invalidateConfig = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: affiliateConfigQueryKey(affiliateAddress) })
  }, [queryClient, affiliateAddress])

  const registerMutation = useMutation({
    mutationFn: (bps: number) =>
      postJson(AFFILIATE_URL, 'POST', { walletAddress: affiliateAddress, bps }, authHeaders),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Affiliate registered successfully' })
      invalidateConfig()
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  })

  const claimCodeMutation = useMutation({
    mutationFn: (code: string) =>
      postJson(
        `${AFFILIATE_URL}/claim-code`,
        'POST',
        { walletAddress: affiliateAddress, partnerCode: code },
        authHeaders,
      ),
    onSuccess: (_, code) => {
      setMessage({ type: 'success', text: `Partner code "${code}" claimed` })
      invalidateConfig()
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  })

  const updateBpsMutation = useMutation({
    mutationFn: (bps: number) =>
      postJson(
        `${AFFILIATE_URL}/${encodeURIComponent(affiliateAddress)}`,
        'PATCH',
        { bps },
        authHeaders,
      ),
    onSuccess: (_, bps) => {
      setMessage({ type: 'success', text: `BPS updated to ${bps}` })
      invalidateConfig()
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  })

  const updateReceiveAddressMutation = useMutation({
    mutationFn: (address: string) =>
      postJson(
        `${AFFILIATE_URL}/${encodeURIComponent(affiliateAddress)}`,
        'PATCH',
        { receiveAddress: address },
        authHeaders,
      ),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Receive address updated' })
      invalidateConfig()
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  })

  const isLoading =
    registerMutation.isPending ||
    claimCodeMutation.isPending ||
    updateBpsMutation.isPending ||
    updateReceiveAddressMutation.isPending

  return {
    isLoading,
    message,
    setMessage,
    clearMessage,
    register: bps => {
      setMessage(null)
      registerMutation.mutate(bps)
    },
    claimCode: async code => {
      setMessage(null)
      await claimCodeMutation.mutateAsync(code)
    },
    updateBps: async bps => {
      setMessage(null)
      await updateBpsMutation.mutateAsync(bps)
    },
    updateReceiveAddress: async addr => {
      setMessage(null)
      await updateReceiveAddressMutation.mutateAsync(addr)
    },
  }
}
