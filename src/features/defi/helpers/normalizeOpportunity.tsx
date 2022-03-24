import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { bnOrZero, SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useSelector } from 'react-redux'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'
import { selectAssetIds } from 'state/slices/selectors'

import { DefiType } from '../contexts/DefiManagerProvider/DefiManagerProvider'

export type EarnOpportunityType = {
  type?: string
  provider: string
  version: string
  contractAddress: string
  tokenAddress: string
  apy?: number | string
  tvl: string
  assetId: CAIP19
  fiatAmount: string
  cryptoAmount: string
  expired?: boolean
  chain: ChainTypes
}

const useTransformVault = (vaults: SupportedYearnVault[]): EarnOpportunityType[] => {
  const assetIds = useSelector(selectAssetIds)

  const network = NetworkTypes.MAINNET
  const assetNamespace = caip19.AssetNamespace.ERC20
  const { vaults: vaultsWithBalances } = useVaultBalances()
  return vaults.reduce<EarnOpportunityType[]>((acc, vault) => {
    let fiatAmount = '0'
    let cryptoAmount = '0'
    if (vaultsWithBalances[vault.vaultAddress]) {
      const balances = vaultsWithBalances[vault.vaultAddress]
      cryptoAmount = balances.cryptoAmount
      fiatAmount = balances.fiatAmount
    }
    const assetCAIP19 = caip19.toCAIP19({
      chain: vault.chain,
      network,
      assetNamespace,
      assetReference: vault.tokenAddress
    })
    const data = {
      type: vault.type,
      provider: vault.provider,
      version: vault.version,
      contractAddress: vault.vaultAddress,
      tokenAddress: vault.tokenAddress,
      tvl: bnOrZero(vault.underlyingTokenBalance.amountUsdc).div(`1e+${USDC_PRECISION}`).toString(),
      apy: vault.metadata.apy?.net_apy,
      expired: vault.expired,
      chain: vault.chain,
      assetId: assetCAIP19,
      fiatAmount,
      cryptoAmount
    }
    // show vaults that are expired but have a balance
    // show vaults that don't have an APY but have a balance
    // don't show vaults that don't have a balance and don't have an APY
    if (assetIds.includes(assetCAIP19)) {
      if (vault.expired || bnOrZero(vault?.metadata?.apy?.net_apy).isEqualTo(0)) {
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

const transformFoxy = (foxies: any[]): EarnOpportunityType[] => {
  return foxies.map(foxy => {
    return {
      type: DefiType.TokenStaking,
      provider: 'ShapeShift',
      version: '1',
      contractAddress: foxy.contractAddress,
      tokenAddress: foxy.tokenAddress,
      tvl: '100',
      apy: 0.1,
      expired: false,
      chain: ChainTypes.Ethereum,
      assetId: '222',
      fiatAmount: '100',
      cryptoAmount: '0'
    }
  })
}

type NormalizeOpportunitiesProps = {
  vaultArray: SupportedYearnVault[]
  foxyArray: any[]
}

export const useNormalizeOpportunities = ({
  vaultArray,
  foxyArray
}: NormalizeOpportunitiesProps): EarnOpportunityType[] => {
  return [...useTransformVault(vaultArray), ...transformFoxy(foxyArray)]
}
