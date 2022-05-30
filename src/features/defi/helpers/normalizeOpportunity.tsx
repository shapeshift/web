import { AssetId, ChainId, toAssetId } from '@shapeshiftoss/caip'
import { SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { chainTypeToMainnetChainId } from 'lib/utils'
import { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosStakingBalances'
import { MergedFoxyOpportunity } from 'pages/Defi/hooks/useFoxyBalances'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'
import { selectAssetIds } from 'state/slices/selectors'

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
  assetId: AssetId
  fiatAmount: string
  cryptoAmount: string
  expired?: boolean
  chainId: ChainId
  moniker?: string
  showAssetSymbol?: boolean
  isLoaded: boolean
}

const useTransformVault = (vaults: SupportedYearnVault[]): EarnOpportunityType[] => {
  const assetIds = useSelector(selectAssetIds)

  const assetNamespace = 'erc20'
  const { vaults: vaultsWithBalances } = useVaultBalances()
  return vaults.reduce<EarnOpportunityType[]>((acc, vault) => {
    const chainId = chainTypeToMainnetChainId(vault.chain)
    let fiatAmount = '0'
    let cryptoAmount = '0'
    if (vaultsWithBalances[vault.vaultAddress]) {
      const balances = vaultsWithBalances[vault.vaultAddress]
      cryptoAmount = balances.cryptoAmount
      fiatAmount = balances.fiatAmount
    }
    const assetId = toAssetId({
      chainId,
      assetNamespace,
      assetReference: vault.tokenAddress,
    })
    const data = {
      type: vault.type,
      provider: vault.provider,
      version: vault.version,
      contractAddress: vault.vaultAddress,
      rewardAddress: vault.vaultAddress,
      tvl: bnOrZero(vault.underlyingTokenBalance.amountUsdc).div(`1e+${USDC_PRECISION}`).toString(),
      apy: vault.metadata.apy?.net_apy,
      expired: vault.expired,
      chainId,
      assetId,
      fiatAmount,
      cryptoAmount,
      // DeFi foxy and yearn vaults are already loaded by the time they are transformed
      isLoaded: true,
    }
    // show vaults that are expired but have a balance
    // show vaults that don't have an APY but have a balance
    // don't show vaults that don't have a balance and don't have an APY
    // don't show new vaults that have an APY over 20,000% APY
    if (assetIds.includes(assetId)) {
      if (
        vault.expired ||
        bnOrZero(vault?.metadata?.apy?.net_apy).isEqualTo(0) ||
        bnOrZero(vault.underlyingTokenBalance.amountUsdc).isEqualTo(0) ||
        (bnOrZero(vault?.metadata?.apy?.net_apy).gt(200) && vault?.metadata?.apy?.type === 'new')
      ) {
        if (bnOrZero(cryptoAmount).gt(0)) {
          acc.push(data)
        }
      } else {
        acc.push(data)
      }
    }
    return acc
  }, [])
}

const transformFoxy = (foxies: MergedFoxyOpportunity[]): EarnOpportunityType[] => {
  return foxies.map(foxy => {
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
      cryptoAmount,
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
      cryptoAmount,
      // DeFi foxy and yearn vaults are already loaded by the time they are transformed
      isLoaded: true,
    }
  })
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
        cryptoAmount: staking.cryptoAmount ?? '',
        moniker: staking.moniker,
        version:
          !bnOrZero(staking.cryptoAmount).isZero() &&
          translate('defi.validatorMoniker', { moniker: staking.moniker }),
        showAssetSymbol: bnOrZero(staking.cryptoAmount).isZero(),
        isLoaded: Boolean(staking.isLoaded),
      }
    })
    .sort((opportunityA, opportunityB) => {
      return bnOrZero(opportunityA.cryptoAmount).gt(bnOrZero(opportunityB.cryptoAmount)) ? -1 : 1
    })
}

type NormalizeOpportunitiesProps = {
  vaultArray: SupportedYearnVault[]
  foxyArray: MergedFoxyOpportunity[]
  cosmosStakingOpportunities: MergedActiveStakingOpportunity[]
}

export const useNormalizeOpportunities = ({
  vaultArray,
  foxyArray,
  cosmosStakingOpportunities = [],
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [
    ...transformFoxy(foxyArray),
    ...useTransformCosmosStaking(cosmosStakingOpportunities),
    ...useTransformVault(vaultArray),
  ]
}
