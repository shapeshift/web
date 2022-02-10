import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { accountToPortfolio } from 'state/slices/portfolioSlice/utils'

// Creates a mock portfolio
export const mockUpsertPortfolio = (
  accounts: chainAdapters.Account<ChainTypes.Ethereum | ChainTypes.Bitcoin>[],
  assetIds: string[]
) => {
  const portfolioAccounts = accounts.reduce(
    (
      acc: { [k: string]: chainAdapters.Account<ChainTypes.Ethereum | ChainTypes.Bitcoin> },
      account: chainAdapters.Account<ChainTypes.Ethereum | ChainTypes.Bitcoin>
    ) => {
      acc[account.pubkey] = account
      return acc
    },
    {}
  )

  return accountToPortfolio({ portfolioAccounts, assetIds })
}
