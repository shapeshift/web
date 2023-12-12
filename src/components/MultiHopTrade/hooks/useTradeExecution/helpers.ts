import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { FromOrXpub } from '@shapeshiftoss/swapper'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { assertGetChainAdapter } from 'lib/utils'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

export type WithFromOrXpubParams = {
  chainId: ChainId
  accountMetadata: AccountMetadata
  wallet: HDWallet
}

// Gets a from address / xpub depending on the chain
export const withFromOrXpub =
  <T, P extends FromOrXpub>(wrappedFunction: (fnParams: P) => Promise<T>) =>
  async (
    { chainId, accountMetadata, wallet }: WithFromOrXpubParams,
    fnParams: Omit<P, 'from' | 'xpub'>,
  ): Promise<T> => {
    const accountNumber = accountMetadata.bip44Params.accountNumber

    if (isUtxoChainId(chainId)) {
      const accountType = accountMetadata.accountType
      if (!accountType) throw new Error('Account number required')
      const adapter = assertGetUtxoChainAdapter(chainId)
      const { xpub } = await adapter.getPublicKey(wallet, accountNumber, accountType)

      return wrappedFunction({ ...fnParams, xpub } as P)
    } else {
      const adapter = assertGetChainAdapter(chainId)
      const from = await adapter.getAddress({ wallet, accountNumber })
      return wrappedFunction({ ...fnParams, from } as P)
    }
  }
