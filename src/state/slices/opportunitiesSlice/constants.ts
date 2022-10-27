import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'

// LP pairs
export const foxEthPair = [foxAssetId, ethAssetId] as const
export const foxEthLpAssetId: AssetId = 'erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'
export const foxEthStakingAssetIdV1: AssetId = '0xDd80E21669A664Bce83E3AD9a0d74f8Dad5D9E72'
export const foxEthStakingAssetIdV2: AssetId = '0xc54B9F82C1c54E9D4d274d633c7523f2299c42A0'
export const foxEthStakingAssetIdV3: AssetId = '0x212ebf9fd3c10f371557b08e993eaab385c3932b'
export const foxEthStakingAssetIdV4: AssetId = '0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0'
