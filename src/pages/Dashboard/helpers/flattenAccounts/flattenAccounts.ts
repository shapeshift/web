import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

type FlattenAccountArgs = Record<string, chainAdapters.Account<ChainTypes>>

export type FlattenedAccount = {
  balance: string
  tokenId?: string
  chain: ChainTypes
}

export const flattenAccounts = (accounts: FlattenAccountArgs) => {
  const array: FlattenedAccount[] = []
  Object.values(accounts).forEach(genericAccount => {
    switch (genericAccount.chain) {
      case ChainTypes.Ethereum: {
        const account = genericAccount as chainAdapters.Account<ChainTypes.Ethereum>
        array.push({ balance: account.balance, chain: account.chain })
        if (account.chainSpecific.tokens) {
          account.chainSpecific.tokens.forEach(tokenAccount => {
            array.push({
              balance: tokenAccount.balance,
              chain: account.chain,
              tokenId: tokenAccount.contract.toLowerCase()
            })
          })
        }
        break
      }
      case ChainTypes.Bitcoin: {
        const account = genericAccount as chainAdapters.Account<ChainTypes.Bitcoin>
        array.push({ balance: account.balance, chain: account.chain })
        break
      }
      default: {
        console.error(`AccountList: unknown chain ${genericAccount.chain}`)
        break
      }
    }
  })
  return array
}
