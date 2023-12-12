import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { Err, type Result } from '@sniptt/monads'
import type { QueryFunction } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { GetAllowanceArgs } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import {
  getAllowance,
  GetAllowanceErr,
} from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { useWallet } from 'hooks/useWallet/useWallet'

import { useBlockNumber } from './useBlockNumber'

type QueryKeyArgs = Partial<Omit<GetAllowanceArgs, 'wallet'>> & { blockNumber: bigint | undefined }

const queryKey = ({
  accountNumber,
  allowanceContract,
  blockNumber,
  chainId,
  assetId,
  accountId,
}: QueryKeyArgs) =>
  [
    'useAllowance',
    {
      accountNumber,
      allowanceContract,
      blockNumber: blockNumber?.toString(), // manual stringify of bigint since it's not JSON serializable by default
      chainId,
      assetId,
      accountId,
    },
  ] as const

export function useAllowance(
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
  watch: boolean,
) {
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

  const blockNumber = useBlockNumber(chainId, watch)

  const allowanceQuery = useQuery({
    queryKey: queryKey({
      accountNumber,
      allowanceContract,
      blockNumber,
      chainId,
      assetId,
      accountId: sellAssetAccountId,
    }),
    queryFn,
    enabled: Boolean(watch && wallet && blockNumber),
  })

  return allowanceQuery
}
