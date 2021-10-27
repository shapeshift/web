import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

import { AccountRow } from '../AccountRow/AccountRow'

type AccountListProps = {
  accounts: Record<string, chainAdapters.Account<ChainTypes>>
}

export const AccountList = ({ accounts }: AccountListProps) => (
  <>
    {Object.values(accounts).map(genericAccount => {
      switch (genericAccount.chain) {
        case ChainTypes.Ethereum: {
          const account = genericAccount as chainAdapters.Account<ChainTypes.Ethereum>
          return (
            <>
              <AccountRow key={account.chain} balance={account.balance} chain={account.chain} />
              {account.chainSpecific.tokens &&
                account.chainSpecific.tokens.map(tokenAccount => (
                  <AccountRow
                    key={`${account.chain}-${tokenAccount.contract}`}
                    balance={tokenAccount.balance}
                    chain={account.chain}
                    tokenId={tokenAccount.contract}
                  />
                ))}
            </>
          )
        }
        case ChainTypes.Bitcoin: {
          const account = genericAccount as chainAdapters.Account<ChainTypes.Bitcoin>
          return <AccountRow key={account.chain} balance={account.balance} chain={account.chain} />
        }
        default: {
          console.error(`AccountList: unknown chain ${genericAccount.chain}`)
          return null
        }
      }
    })}
  </>
)
