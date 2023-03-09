import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  LpEarnOpportunityType,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvents } from './types'

export const getMaybeCompositeAssetSymbol = (assetId: AssetId) => {
  const asset = selectAssetById(store.getState(), assetId ?? '')
  if (!asset) return assetId
  const { chainId } = fromAssetId(assetId)
  const networkName = getChainAdapterManager().get(chainId)?.getDisplayName()
  return `${networkName}.${asset?.symbol}`
}

// mixpanel?.track(MixPanelEvents.DepositContinue, {
//   provider: opportunityData.provider,
//   type: opportunityData.type,
//   version: opportunityData.version,
//   assets: opportunityData.underlyingAssetIds.map(getMaybeCompositeAssetSymbol),
//   fiatAmounts: [bnOrZero(formValues.fiatAmount).toNumber()],
//   cryptoAmounts: [`${formValues.cryptoAmount} ${getMaybeCompositeAssetSymbol(assetId)}`],
//   ...Object.fromEntries(
//     claimAmounts.map(claimAmount => [
//       getCompositeAssetSymbol(claimAmount.assetId),
//       claimAmount.amountCryptoHuman,
//     ]),
//   ),
// })

type trackOpportunityProps = {
  opportunity: StakingEarnOpportunityType | LpEarnOpportunityType
  cryptoAmounts: {
    assetId: AssetId
    amountCryptoHuman: string | number
    fiatAmount?: string | number
  }[]
  fiatAmounts: string[] | number[]
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
