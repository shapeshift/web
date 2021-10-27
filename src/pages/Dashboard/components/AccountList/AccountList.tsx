import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

import { AccountRow } from '../AccountRow/AccountRow'

type AccountListProps = {
  accounts: Record<string, chainAdapters.Account<ChainTypes>>
}

function isAccountOfChainType<T extends ChainTypes>(
  chainType: T,
  x: chainAdapters.Account<ChainTypes>
): x is chainAdapters.Account<T> {
  return x.chain === chainType
}

export const AccountList = ({ accounts }: AccountListProps) => (
  <>
    {Object.values(accounts).map(account => {
      if (isAccountOfChainType(ChainTypes.Ethereum, account)) {
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
      } else {
        return <AccountRow key={account.chain} balance={account.balance} chain={account.chain} />
      }
    })}
  </>
)
