import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvents, trackOpportunityProps } from './types'

export const getMaybeCompositeAssetSymbol = (assetId: AssetId) => {
  const asset = selectAssetById(store.getState(), assetId)
  if (!asset) return assetId
  const { chainId } = fromAssetId(assetId)
  const networkName = getChainAdapterManager().get(chainId)?.getDisplayName()
  return `${networkName}.${asset?.symbol}`
}

export const trackOpportunityEvent = (event: MixPanelEvents, properties: trackOpportunityProps) => {
  const mixpanel = getMixPanel()
  const { opportunity, cryptoAmounts, fiatAmounts } = properties
  const eventData = {
    provider: opportunity.provider,
    type: opportunity.type,
    version: opportunity.version,
    assets: opportunity.underlyingAssetIds.map(getMaybeCompositeAssetSymbol),
    fiatAmounts: fiatAmounts.map(fiatAmount => bnOrZero(fiatAmount).toNumber()),
    ...Object.fromEntries(
      cryptoAmounts.map(claimAmount => [
        getMaybeCompositeAssetSymbol(claimAmount.assetId),
        claimAmount.amountCryptoHuman,
      ]),
    ),
  }
  mixpanel?.track(event, eventData)
}

// TODO(0xdef1cafe): draft
export type AnonymizedPortfolio = {
  fiatBalance: number // $420.69
  walletHash: string // e.g. '2398734895'
  wallet: string // e.g. 'Native' | 'Metamask' | 'WalletConnect'
  chains: string[] // e.g. ['Bitcoin', 'Ethereum']
  assets: string[] // e.g. ['Bitcoin.BTC', 'Ethereum.ETH', 'Ethereum.USDC']
  fiatAssetBalances: Record<string, number> // e.g. { 'Bitcoin.BTC': 0.1, 'Ethereum.ETH': 2.13, 'Ethereum.USDC': 420.69 }
}
