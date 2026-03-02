import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { signAndSubmitChainflipCall } from '@/lib/chainflip/eip712'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

type SignChainflipCallArgs = {
  encodedCall: string
  nonceOrAccount: number | string
}

export const useSignChainflipCall = () => {
  const wallet = useWallet().state.wallet
  const { accountId } = useChainflipLendingAccount()

  const accountMetadataFilter = useMemo(() => ({ accountId }), [accountId])
  const accountMetadata = useAppSelector(state =>
    accountId ? selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter) : undefined,
  )

  const mutationFn = useCallback(
    ({ encodedCall, nonceOrAccount }: SignChainflipCallArgs) => {
      if (!wallet) throw new Error('Wallet not connected')
      if (!accountMetadata) throw new Error('Account metadata not found')

      return signAndSubmitChainflipCall({
        wallet,
        accountMetadata,
        encodedCall,
        nonceOrAccount,
      })
    },
    [wallet, accountMetadata],
  )

  const { mutateAsync, isPending, error, reset } = useMutation({
    mutationFn,
  })

  return useMemo(
    () => ({
      signAndSubmit: mutateAsync,
      isLoading: isPending,
      error,
      reset,
    }),
    [mutateAsync, isPending, error, reset],
  )
}
