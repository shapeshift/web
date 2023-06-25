import type { ChainId } from '@shapeshiftoss/caip'
import type { UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

export type WithFromOrXpubParams = {
  chainId?: ChainId
  accountMetadata?: AccountMetadata
  wallet?: HDWallet
  from?: string
  xpub?: string
}

// Gets a from address either
// - derived from the input (for our own consumption with our AccountMetadata and ChainId structures)
// - or simply falls the passed from address through, for external consumers
export const withFromOrXpub =
  <T, P>(wrappedFunction: (params: P & { from?: string; xpub?: string }) => Promise<T>) =>
  async (params: WithFromOrXpubParams & P): Promise<T> => {
    const { chainId, accountMetadata, wallet, from: inputFrom, xpub: inputXpub } = params

    let from: string | undefined = inputFrom
    let xpub: string | undefined = inputXpub

    if (!from && !xpub) {
      if (!wallet) throw new Error('Wallet required for getAddress and getPublicKey calls')

      const chainAdapterManager = getChainAdapterManager()
      if (!chainId) throw new Error('No chainId provided')
      const adapter = chainAdapterManager.get(chainId)
      if (!adapter) throw new Error(`No adapter for ChainId: ${chainId}`)

      const accountNumber = accountMetadata?.bip44Params?.accountNumber
      const accountType = accountMetadata?.accountType

      if (!accountNumber) throw new Error('Account number required')
      if (isUtxoChainId(chainId)) {
        if (!accountType) throw new Error('Account number required')
        xpub = (
          await (adapter as unknown as UtxoChainAdapter).getPublicKey(
            wallet,
            accountNumber,
            accountType,
          )
        ).xpub
      } else {
        from = await adapter.getAddress({ wallet, accountNumber })
      }
    }

    return wrappedFunction({ ...params, from, xpub })
  }
