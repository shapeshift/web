import { Account } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { accountToPortfolio } from 'state/slices/portfolioSlice/utils'

type MockChainIds =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.BitcoinMainnet
  | KnownChainIds.CosmosMainnet

// Creates a mock portfolio
export const mockUpsertPortfolio = (accounts: Account<MockChainIds>[], assetIds: string[]) => {
  const portfolioAccounts = accounts.reduce(
    (
      acc: {
        [k: string]: Account<MockChainIds>
      },
      account: Account<MockChainIds>,
    ) => {
      acc[account.pubkey] = account
      return acc
    },
    {},
  )

  return accountToPortfolio({ portfolioAccounts, assetIds })
}
