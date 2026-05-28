import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { postJson } from '../lib/api'
import { AFFILIATE_URL } from '../lib/constants'
import { affiliateConfigQueryKey } from './useAffiliateConfig'

export interface ActionMessage {
  type: 'success' | 'error'
  text: string
}

export interface RegisterArgs {
  bps: number
  partnerCode: string
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
  register: (args: RegisterArgs) => void
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
    mutationFn: (args: RegisterArgs) =>
      postJson(
        AFFILIATE_URL,
        'POST',
        { walletAddress: affiliateAddress, bps: args.bps, partnerCode: args.partnerCode },
        authHeaders,
      ),
    onSuccess: (_, args) => {
      setMessage({ type: 'success', text: `Affiliate registered as "${args.partnerCode}"` })
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
    updateBpsMutation.isPending ||
    updateReceiveAddressMutation.isPending

  return {
    isLoading,
    message,
    setMessage,
    clearMessage,
    register: args => {
      setMessage(null)
      registerMutation.mutate(args)
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
