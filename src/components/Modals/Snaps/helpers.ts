import { type ChainId, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { deriveAccountIdsAndMetadataForChainNamespace } from 'lib/account/account'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import type { AppDispatch } from 'state/store'

export const fetchAccountForChainId = async (
  chainId: ChainId,
  wallet: HDWallet,
  walletDeviceId: string,
  dispatch: AppDispatch,
  isSnapInstalled: boolean,
  accountNumber: number,
) => {
  const { chainNamespace } = fromChainId(chainId)

  const accountMetadataByAccountId = await deriveAccountIdsAndMetadataForChainNamespace[
    chainNamespace
  ]({
    accountNumber,
    chainIds: [chainId],
    wallet,
    isSnapInstalled,
  })

  const accountIds = Object.keys(accountMetadataByAccountId)
  const { getAccount } = portfolioApi.endpoints
  const accountPromises = accountIds.map(accountId =>
    dispatch(getAccount.initiate({ accountId }, { forceRefetch: true })),
  )
  const accountResults = await Promise.allSettled(accountPromises)

  let i = 0

  for (const res of accountResults) {
    const accountId = accountIds[i]

    if (res.status === 'rejected') {
      console.error(`Failed to fetch account ${accountIds[i]}`, res.reason)
      continue
    }
    const { data: account } = res.value
    if (!account) continue

    const accountMetadata = accountMetadataByAccountId[accountId]
    const payload = {
      accountMetadataByAccountId: { [accountId]: accountMetadata },
      walletId: walletDeviceId,
    }

    dispatch(portfolio.actions.upsertAccountMetadata(payload))
    dispatch(portfolio.actions.upsertPortfolio(account))
    dispatch(portfolio.actions.enableAccountId(accountId))

    i++
  }
}
