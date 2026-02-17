import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'

import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { txHistory } from '@/state/slices/txHistorySlice/txHistorySlice'
import type { AppDispatch } from '@/state/store'

type ParseAndUpsertSecondClassChainTxArgs = {
  chainId: ChainId
  txHash: string
  accountId: AccountId
  accountIdsToRefetch?: AccountId[]
  dispatch: AppDispatch
}

export const parseAndUpsertSecondClassChainTx = async ({
  chainId,
  txHash,
  accountId,
  accountIdsToRefetch,
  dispatch,
}: ParseAndUpsertSecondClassChainTxArgs): Promise<void> => {
  if (!SECOND_CLASS_CHAINS.includes(chainId as KnownChainIds)) return

  const accountIdsToUpsert = accountIdsToRefetch ?? [accountId]

  const adapter = getChainAdapterManager().get(chainId)
  if (!adapter?.parseTx) return

  await Promise.all(
    accountIdsToUpsert.map(async accountIdToUpsert => {
      const { account: address } = fromAccountId(accountIdToUpsert)
      const parsedTx = await adapter.parseTx(txHash, address)
      dispatch(txHistory.actions.onMessage({ message: parsedTx, accountId: accountIdToUpsert }))
    }),
  )

  accountIdsToUpsert.forEach(accountIdToRefresh => {
    dispatch(
      portfolioApi.endpoints.getAccount.initiate(
        { accountId: accountIdToRefresh, upsertOnFetch: true },
        { forceRefetch: true },
      ),
    )
  })
}
