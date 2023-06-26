import type { ChainId } from '@shapeshiftoss/caip'
import type { UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { FromOrXpub } from 'lib/swapper/api'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
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
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)
    if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)

    const accountNumber = accountMetadata.bip44Params.accountNumber

    if (isUtxoChainId(chainId)) {
      const accountType = accountMetadata.accountType
      if (!accountType) throw new Error('Account number required')
      const { xpub } = await (adapter as unknown as UtxoChainAdapter).getPublicKey(
        wallet,
        accountNumber,
        accountType,
      )

      return wrappedFunction({ ...fnParams, xpub } as P)
    } else {
      const from = await adapter.getAddress({ wallet, accountNumber })
      return wrappedFunction({ ...fnParams, from } as P)
    }
  }
