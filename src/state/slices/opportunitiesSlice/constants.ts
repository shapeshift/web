import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import type { FoxEthStakingContractAddress } from '@shapeshiftoss/contracts'
import { foxEthStakingContractAddresses } from '@shapeshiftoss/contracts'
import { getTypeGuardAssertion } from 'lib/utils'

import type { DefiProviderMetadata, LpId, StakingId } from './types'
import { DefiProvider } from './types'

// UniswapV2Router02 https://docs.uniswap.org/protocol/V2/reference/smart-contracts/router-02
export const uniswapV2Router02AssetId: AssetId =
  'eip155:1/erc20:0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
// LP contracts
export const foxEthPair = [ethAssetId, foxAssetId]
export const foxEthLpAssetId: LpId = 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'
export const foxEthLpAssetIds = [foxEthLpAssetId] as const

const isFoxEthStakingContractAddress = (
  address: FoxEthStakingContractAddress | string,
): address is FoxEthStakingContractAddress =>
  foxEthStakingContractAddresses.includes(address as FoxEthStakingContractAddress)

export const assertIsFoxEthStakingContractAddress: (
  value: FoxEthStakingContractAddress | string,
) => asserts value is FoxEthStakingContractAddress = getTypeGuardAssertion(
  isFoxEthStakingContractAddress,
  "Contract address isn't a known ETH/FOX staking address",
)

export const foxEthStakingAssetIdV1: AssetId =
  'eip155:1/erc20:0xdd80e21669a664bce83e3ad9a0d74f8dad5d9e72'
export const foxEthStakingAssetIdV2: AssetId =
  'eip155:1/erc20:0xc54b9f82c1c54e9d4d274d633c7523f2299c42a0'
export const foxEthStakingAssetIdV3: AssetId =
  'eip155:1/erc20:0x212ebf9fd3c10f371557b08e993eaab385c3932b'
export const foxEthStakingAssetIdV4: AssetId =
  'eip155:1/erc20:0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0'
export const foxEthStakingAssetIdV5: AssetId =
  'eip155:1/erc20:0xc14eaa8284feff79edc118e06cadbf3813a7e555'
export const foxEthStakingAssetIdV6: AssetId =
  'eip155:1/erc20:0xebb1761ad43034fd7faa64d84e5bbd8cb5c40b68'
export const foxEthStakingAssetIdV7: AssetId =
  'eip155:1/erc20:0x5939783dbf3e9f453a69bc9ddc1e492efac1fbcb'
export const foxEthStakingAssetIdV8: AssetId =
  'eip155:1/erc20:0x662da6c777a258382f08b979d9489c3fbbbd8ac3'
export const foxEthStakingAssetIdV9: AssetId =
  'eip155:1/erc20:0x721720784b76265aa3e34c1c7ba02a6027bcd3e5'

// Tuple of all staking contracts as AssetIds, to iterate over and dispatch RTK queries for
export const foxEthAssetIds = [
  foxEthStakingAssetIdV1,
  foxEthStakingAssetIdV2,
  foxEthStakingAssetIdV3,
  foxEthStakingAssetIdV4,
  foxEthStakingAssetIdV5,
  foxEthStakingAssetIdV6,
  foxEthStakingAssetIdV7,
  foxEthStakingAssetIdV8,
  foxEthStakingAssetIdV9,
] as const
export const foxEthStakingIds = foxEthAssetIds as readonly StakingId[]

export const STAKING_ID_TO_VERSION = {
  [foxEthStakingAssetIdV1]: 'V1',
  [foxEthStakingAssetIdV2]: 'V2',
  [foxEthStakingAssetIdV3]: 'V3',
  [foxEthStakingAssetIdV4]: 'V4',
  [foxEthStakingAssetIdV5]: 'V5',
  [foxEthStakingAssetIdV6]: 'V6',
  [foxEthStakingAssetIdV7]: 'V7',
  [foxEthStakingAssetIdV8]: 'V8',
  [foxEthStakingAssetIdV9]: 'V9',
}

export const rFOXStakingIds = [foxOnArbitrumOneAssetId] as readonly StakingId[]

export const STAKING_ID_DELIMITER = '*'

export const DEFI_PROVIDER_TO_METADATA: Record<DefiProvider, DefiProviderMetadata> = {
  [DefiProvider.ShapeShift]: {
    provider: DefiProvider.ShapeShift,
    icon: '/fox-token-logo.png',
    color: '#3761F9',
    url: 'https://app.shapeshift.com',
  },
  [DefiProvider.EthFoxStaking]: {
    provider: DefiProvider.EthFoxStaking,
    icon: '/fox-token-logo.png',
    color: '#00CD98',
    url: 'https://app.shapeshift.com',
  },
  [DefiProvider.rFOX]: {
    provider: DefiProvider.rFOX,
    icon: '/fox-token-logo.png',
    color: '#00CD98',
    url: 'https://app.shapeshift.com/#/rfox',
  },
  [DefiProvider.UniV2]: {
    provider: DefiProvider.UniV2,
    icon: 'https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604',
    color: '#FD0078',
    url: 'https://app.uniswap.org',
  },
  [DefiProvider.CosmosSdk]: {
    provider: DefiProvider.CosmosSdk,
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/cosmos/info/logo.png',
    color: '#C5B5F2',
    url: 'https://app.shapeshift.com',
  },
  [DefiProvider.ThorchainSavers]: {
    provider: DefiProvider.ThorchainSavers,
    icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/thorchain/info/logo.png',
    color: '#0CDBE0',
    url: 'https://app.shapeshift.com',
  },
}
