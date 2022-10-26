import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'

// LP pairs
export const foxEthPair = [foxAssetId, ethAssetId] as const
export const foxEthLpAssetId: AssetId = 'erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'
