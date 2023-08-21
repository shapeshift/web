import type { StdTx } from '@cosmjs/amino'
import type { AssetId } from '@shapeshiftoss/caip'
import type { cosmos, osmosis } from '@shapeshiftoss/chain-adapters'
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import { sign } from '@shapeshiftoss/proto-tx-builder'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput, ExecuteTradeArgs, Swapper2 } from 'lib/swapper/api'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'

import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { SUPPORTED_ASSET_IDS } from './utils/constants'

export const osmosisSwapper: Swapper2 = {
  executeTrade: async ({ txToSign, wallet, chainId }: ExecuteTradeArgs) => {
    const adapter = assertGetCosmosSdkChainAdapter(chainId) as
      | cosmos.ChainAdapter
      | osmosis.ChainAdapter

    // Note this block is currently disabled until we move this out of web - update me to true to test things out
    // Else, this would always use Keplr for signing instead of native/KK, regardless of the currently connected wallet
    const isExternalSignerEnabled = false
    // TODO: The signer should actually be injected, this is just a PoC implementation
    // The signer won't have access to the window global, all we'll need is the offlineSigner, see below
    if (isExternalSignerEnabled && typeof window !== 'undefined' && window.keplr) {
      const cosmosSdkChainId = (txToSign as CosmosSignTx).chain_id
      // Enables Keplr for the ChainId of the current step
      await window.keplr.enable(cosmosSdkChainId)
      // The actual signer - that's all we really need to pass in instead of wallet
      // Note, if we dogfood the SDK in web, we'll need to ensure we disable cross-account-number trading for Osmosis
      const offlineSigner = window.keplr.getOfflineSigner(cosmosSdkChainId)
      const accounts = await offlineSigner.getAccounts()
      // Keplr only manages one address/pubkey pair
      const signerAddress = accounts[0].address
      const signerData = {
        sequence: Number((txToSign as CosmosSignTx).sequence),
        // TODO: Since keplr only supports a single key pair, should we assume account 0 here?
        accountNumber: Number((txToSign as CosmosSignTx).account_number),
        chainId: cosmosSdkChainId,
      }

      const signedTx = await sign(
        signerAddress,
        (txToSign as CosmosSignTx).tx as StdTx,
        offlineSigner,
        signerData,
      )

      // This will return the broadcasted Txid of the current step
      return adapter.broadcastTransaction(signedTx.serialized)
    }

    const signedTx = await adapter.signTransaction({
      txToSign: txToSign as CosmosSignTx,
      wallet,
    })
    return adapter.broadcastTransaction(signedTx)
  },

  filterAssetIdsBySellable: (_assetIds: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve([...SUPPORTED_ASSET_IDS])
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
