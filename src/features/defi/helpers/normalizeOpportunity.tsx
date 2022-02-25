import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { bnOrZero, SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useSelector } from 'react-redux'
import { selectAssetIds } from 'state/slices/selectors'

import { DefiType } from '../contexts/DefiManagerProvider/DefiManagerProvider'
import { useYearn } from '../contexts/YearnProvider/YearnProvider'

// return vaults.reduce<EarnOpportunityType[]>((acc, vault) => {
//   const network = NetworkTypes.MAINNET
//   const contractType = ContractTypes.ERC20
//   // asset
//   const assetCAIP19 = caip19.toCAIP19({
//     chain: vault.chain,
//     network,
//     contractType,
//     tokenId: vault.tokenAddress
//   })
//   const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))

//   const data = {
//     type: vault.type,
//     provider: vault.provider,
//     version: vault.version,
//     contractAddress: vault.vaultAddress,
//     tokenAddress: vault.tokenAddress,
//     tvl: bnOrZero(vault.underlyingTokenBalance.amountUsdc).div(`1e+${USDC_PRECISION}`).toString(),
//     apy: vault.metadata.apy?.net_apy,
//     expired: vault.expired,
//     chain: vault.chain
//   }
//   if (asset) {
//     acc.push(data)
//   }

//   return acc
// }, [])

export type EarnOpportunityType = {
  type?: string
  provider: string
  version: string
  contractAddress: string
  tokenAddress: string
  apy?: number
  tvl: string
  assetId?: CAIP19
  fiatAmount?: string
  cryptoAmount?: string
  expired?: boolean
  chain: ChainTypes
}

const useTransformVault = (vaults: SupportedYearnVault[]): EarnOpportunityType[] => {
  const assetIds = useSelector(selectAssetIds)
  const { yearn } = useYearn()
  return vaults.reduce<EarnOpportunityType[]>((acc, vault) => {
    if (!yearn) return acc
    const _vault = yearn.findByVaultTokenId(vault.vaultAddress)
    const network = NetworkTypes.MAINNET
    const contractType = ContractTypes.ERC20
    const assetCAIP19 = caip19.toCAIP19({
      chain: vault.chain,
      network,
      contractType,
      tokenId: vault.tokenAddress
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
      assetId: assetCAIP19
    }
    if (assetIds.includes(assetCAIP19) && _vault) {
      acc.push(data)
    } else {
      console.info('exclude', data)
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
      apy: 100,
      expired: false,
      chain: ChainTypes.Ethereum
    }
  })
}

type NoramlizeEarnOpportunitiesProps = {
  vaultArray: SupportedYearnVault[]
  foxyArray: any[]
}

export const NoramlizeEarnOpportunities = ({
  vaultArray,
  foxyArray
}: NoramlizeEarnOpportunitiesProps): EarnOpportunityType[] => {
  return [...useTransformVault(vaultArray), ...transformFoxy(foxyArray)]
}
