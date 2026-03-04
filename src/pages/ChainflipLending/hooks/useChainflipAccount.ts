import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const FIFTEEN_SECONDS = 15_000
const THIRTY_SECONDS = 30_000

export const useChainflipAccount = () => {
  const { scAccount } = useChainflipLendingAccount()

  const { data: rawFreeBalances, isLoading: isFreeBalancesLoading } = useQuery({
    ...reactQueries.chainflipLending.freeBalances(scAccount ?? ''),
    enabled: !!scAccount,
    staleTime: FIFTEEN_SECONDS,
  })

  const freeBalances = useMemo(
    () => (Array.isArray(rawFreeBalances) ? rawFreeBalances : []),
    [rawFreeBalances],
  )

  const { data: accountInfo, isLoading: isAccountInfoLoading } = useQuery({
    ...reactQueries.chainflipLending.accountInfo(scAccount ?? ''),
    enabled: !!scAccount,
    staleTime: THIRTY_SECONDS,
  })

  const isFunded = useMemo(
    () => BigInt(accountInfo?.flip_balance ?? '0') > 0n,
    [accountInfo?.flip_balance],
  )

  const isLpRegistered = useMemo(
    () => accountInfo?.role === 'liquidity_provider',
    [accountInfo?.role],
  )

  const refundAddresses = useMemo(
    () => accountInfo?.refund_addresses ?? null,
    [accountInfo?.refund_addresses],
  )

  const isLoading = useMemo(
    () => isFreeBalancesLoading || isAccountInfoLoading,
    [isFreeBalancesLoading, isAccountInfoLoading],
  )

  return useMemo(
    () => ({
      scAccount,
      freeBalances,
      accountInfo,
      isFunded,
      isLpRegistered,
      refundAddresses,
      isLoading,
    }),
    [scAccount, freeBalances, accountInfo, isFunded, isLpRegistered, refundAddresses, isLoading],
  )
}
