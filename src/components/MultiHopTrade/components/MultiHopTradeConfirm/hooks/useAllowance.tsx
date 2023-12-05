import type { AccountId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import { Err, type Result } from '@sniptt/monads'
import type { QueryFunction } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useBlockNumber } from 'wagmi'
import type { GetAllowanceArgs } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import {
  getAllowance,
  GetAllowanceErr,
} from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuoteStep } from 'lib/swapper/types'

type QueryKeyArgs = Partial<Omit<GetAllowanceArgs, 'wallet'>>

const queryKey = ({
  accountNumber,
  allowanceContract,
  chainId,
  assetId,
  accountId,
}: QueryKeyArgs) =>
  [
    'useAllowance',
    {
      accountNumber,
      allowanceContract,
      chainId,
      assetId,
      accountId,
    },
  ] as const

export type UseAllowanceProps = {
  sellAssetAccountId: AccountId | undefined
  tradeQuoteStep: TradeQuoteStep | undefined
  watch: boolean
  enabled: boolean
}

// TODO: use this pattern for all allowance and trade execution hooks
export function useAllowance({
  sellAssetAccountId,
  tradeQuoteStep,
  watch,
  enabled,
}: UseAllowanceProps) {
  const {
    state: { wallet },
  } = useWallet()

  const {
    accountNumber,
    allowanceContract,
    sellAsset: { chainId, assetId },
  } = useMemo(
    () =>
      tradeQuoteStep ?? {
        accountNumber: undefined,
        allowanceContract: undefined,
        sellAsset: { chainId: undefined, assetId: undefined },
      },
    [tradeQuoteStep],
  )

  const queryFn: QueryFunction<
    Result<string, GetAllowanceErr>,
    ReturnType<typeof queryKey>
  > = useCallback(
    ({ queryKey: [_, { accountNumber, allowanceContract, chainId, assetId, accountId }] }) => {
      if (
        !wallet ||
        accountNumber === undefined ||
        allowanceContract === undefined ||
        chainId === undefined ||
        assetId === undefined ||
        accountId === undefined
      ) {
        return Err(GetAllowanceErr.MissingArgs)
      }

      return getAllowance({
        accountNumber,
        allowanceContract,
        chainId,
        assetId,
        accountId,
        wallet,
      })
    },
    [wallet],
  )

  const allowanceQuery = useQuery({
    queryKey: queryKey({
      accountNumber,
      allowanceContract,
      chainId,
      assetId,
      accountId: sellAssetAccountId,
    }),
    queryFn,
    enabled: Boolean(enabled && wallet),
  })

  const chainReference = useMemo(
    () => (chainId ? Number(fromChainId(chainId).chainReference) : undefined),
    [chainId],
  )
  const { data: blockNumber } = useBlockNumber({ chainId: chainReference, watch })

  useEffect(() => {
    if (!enabled) return
    if (!watch) return
    if (!blockNumber) return

    allowanceQuery.refetch()
  }, [allowanceQuery, blockNumber, enabled, watch])

  return allowanceQuery
}
