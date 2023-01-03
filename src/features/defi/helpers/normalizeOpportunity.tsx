import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import type { MergedFoxyOpportunity } from 'state/apis/foxy/foxyApi'

import { DefiType } from '../contexts/DefiManagerProvider/DefiCommon'
import { chainIdToLabel } from './utils'

export type EarnOpportunityType = {
  type?: string
  provider: string
  version?: string
  contractAddress: string
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

const transformFoxy = (foxies: MergedFoxyOpportunity[]): EarnOpportunityType[] =>
  foxies.map(foxy => {
    const {
      provider,
      contractAddress,
      stakingToken: tokenAddress,
      rewardToken: rewardAddress,
      tvl,
      apy,
      expired,
      chainId,
      tokenAssetId: assetId,
      fiatAmount,
      cryptoAmountPrecision,
      cryptoAmountBaseUnit,
    } = foxy
    return {
      type: DefiType.TokenStaking,
      provider,
      contractAddress,
      tokenAddress,
      rewardAddress,
      tvl: bnOrZero(tvl).toString(),
      apy,
      expired,
      chainId,
      assetId,
      fiatAmount,
      cryptoAmountBaseUnit,
      cryptoAmountPrecision,
      // DeFi foxy and yearn vaults are already loaded by the time they are transformed
      isLoaded: true,
    }
  })

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
  foxyArray: MergedFoxyOpportunity[]
  cosmosSdkStakingOpportunities: MergedActiveStakingOpportunity[]
  foxEthLpOpportunity?: EarnOpportunityType
  stakingOpportunities?: EarnOpportunityType[]
}

export const useNormalizeOpportunities = ({
  foxyArray,
  cosmosSdkStakingOpportunities = [],
  foxEthLpOpportunity,
  stakingOpportunities,
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [
    ...transformFoxy(foxyArray),
    ...useTransformCosmosStaking(cosmosSdkStakingOpportunities),
    ...(stakingOpportunities ? stakingOpportunities : []),
    ...(foxEthLpOpportunity ? [foxEthLpOpportunity] : []),
  ]
}
