import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'

import { DefiType } from '../contexts/DefiManagerProvider/DefiCommon'
import { chainIdToLabel } from './utils'

export type EarnOpportunityType = {
  type?: string
  provider: string
  version?: string
  contractAddress?: string
  rewardAddress: string
  apy?: number | string
  tvl: string
  underlyingAssetId?: AssetId
  assetId: AssetId
  fiatAmount: string
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision: string
  cryptoAmountBaseUnit: string
  expired?: boolean
  chainId: ChainId
  moniker?: string
  showAssetSymbol?: boolean
  isLoaded: boolean
  icons?: string[]
  // overrides any name down the road
  opportunityName?: string
  highestBalanceAccountAddress?: string // FOX/ETH specific, let's change it to accountId across the line if we need it for other opportunities
}

const useTransformCosmosStaking = (
  cosmosStakingOpportunities: MergedActiveStakingOpportunity[],
): EarnOpportunityType[] => {
  const translate = useTranslate()
  return cosmosStakingOpportunities
    .map(staking => {
      return {
        type: DefiType.TokenStaking,
        provider: chainIdToLabel(staking.chainId),
        contractAddress: staking.address,
        rewardAddress: '',
        tvl: staking.tvl,
        apy: staking.apr,
        chainId: staking.chainId,
        assetId: staking.assetId,
        fiatAmount: staking.fiatAmount ?? '',
        cryptoAmountBaseUnit: staking.cryptoAmountBaseUnit ?? '0',
        cryptoAmountPrecision: staking.cryptoAmountPrecision ?? '0',
        moniker: staking.moniker,
        version:
          !bnOrZero(staking.cryptoAmountBaseUnit).isZero() &&
          translate('defi.validatorMoniker', { moniker: staking.moniker }),
        showAssetSymbol: bnOrZero(staking.cryptoAmountBaseUnit).isZero(),
        isLoaded: Boolean(staking.isLoaded),
      }
    })
    .sort((opportunityA, opportunityB) => {
      return bnOrZero(opportunityA.cryptoAmountPrecision).gt(
        bnOrZero(opportunityB.cryptoAmountPrecision),
      )
        ? -1
        : 1
    })
}

type NormalizeOpportunitiesProps = {
  cosmosSdkStakingOpportunities: MergedActiveStakingOpportunity[]
  foxEthLpOpportunity?: EarnOpportunityType
  stakingOpportunities?: EarnOpportunityType[]
}

export const useNormalizeOpportunities = ({
  cosmosSdkStakingOpportunities = [],
  foxEthLpOpportunity,
  stakingOpportunities,
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [
    ...useTransformCosmosStaking(cosmosSdkStakingOpportunities),
    ...(stakingOpportunities ? stakingOpportunities : []),
    ...(foxEthLpOpportunity ? [foxEthLpOpportunity] : []),
  ]
}
