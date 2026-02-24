import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { cfAccountInfo, cfFreeBalances } from '@/lib/chainflip/rpc'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'

const FIFTEEN_SECONDS = 15_000
const THIRTY_SECONDS = 30_000

export const useChainflipAccount = () => {
  const { scAccount } = useChainflipLendingAccount()

  const { data: freeBalances, isLoading: isFreeBalancesLoading } = useQuery({
    queryKey: ['chainflipFreeBalances', scAccount],
    queryFn: scAccount ? () => cfFreeBalances(scAccount) : skipToken,
    staleTime: FIFTEEN_SECONDS,
  })

  const { data: accountInfo, isLoading: isAccountInfoLoading } = useQuery({
    queryKey: ['chainflipAccountInfo', scAccount],
    queryFn: scAccount ? () => cfAccountInfo(scAccount) : skipToken,
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

  const hasRefundAddress = useMemo(() => {
    const refundAddresses = accountInfo?.refund_addresses
    if (!refundAddresses) return false
    return Object.values(refundAddresses).some(addr => addr !== null)
  }, [accountInfo?.refund_addresses])

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
      hasRefundAddress,
      isLoading,
    }),
    [scAccount, freeBalances, accountInfo, isFunded, isLpRegistered, hasRefundAddress, isLoading],
  )
}
