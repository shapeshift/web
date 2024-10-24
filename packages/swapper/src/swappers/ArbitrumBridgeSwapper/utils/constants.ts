import type { ChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'

import type { SupportedChainIds } from '../../../types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: arbitrumBridgeSupportedChainIds as unknown as ChainId[],
  buy: arbitrumBridgeSupportedChainIds as unknown as ChainId[],
}

// Broad estimate calculated by looking at a couple of different ERC-20 deposits
// https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L45-L51
export const fallbackErc20DepositGasLimit = bn(240_000)
// Broad estimate calculated by looking at a couple of different ERC-20 withdraws
// https://arbiscan.io/tx/0xf27939d382abcb0cce5c202489db457a6cc0d0dd8062468543400c3bf321148f
// https://arbiscan.io/tx/0xa4639374806ecc1e9de7beafbab2567c078483b84b708e862bfbd84fbc2fc1da
// https://arbiscan.io/tx/0xb6c3bce7999b2ae4bbe51a64bc7ab370d21ce9bf6807b805239acbf4c244a6db
// https://arbiscan.io/tx/0x878aa224a65d831c931192550b3d8fe114fa81660c1af8369c0e2ebea682dd5b
// https://arbiscan.io/tx/0xf293bd64f9dabddaffc4c8b97f2a602d4e9f77565f5d24018a0f70a95c1ecd38
export const fallbackErc20WithdrawGasLimit = bn(350_000)
// Actually extremely accurate estimate calculated by looking at a couple of different ETH deposits - gas limit is around 100-100.05k
// https://etherscan.io/tx/0x31f7860fdb79c76d0301b9197f4e00ed2432170f1be38288f87838ce1184643a
// https://etherscan.io/tx/0x933c1b625824abeae6f15b4667e22caa3dc14be4929ae62310e2fbf1d39c7d8b
// https://etherscan.io/tx/0x695090931bb09e60fd378210a0c204ebb01cc137ff00e576074c79a41cc4fa80
// https://etherscan.io/tx/0xaaef3d2391e4b07f6f0a7524dadde735d4a9822efc2a611e5e8dd5e2708438cc
export const fallbackEthDepositGasLimit = bn(100_000)
// Broad estimate calculated by looking at a couple of different ETH withdraws
export const fallbackEthWithdrawGasLimit = bn(115_000)
// https://arbiscan.io/tx/0x641f1c0bacced5896e35aa505abe03076323e769e959aa0f7b9c9cd63d1741dd
// https://arbiscan.io/tx/0x060f503fa97b137d4298a6adb87cdae83030e1a43ee265b7d52e3b92493acd62
// https://arbiscan.io/tx/0x162efc48dffb5f7d8c6b454c6df42b4739edb70d2427a311538a0927c5ccdddc
// https://arbiscan.io/tx/0x51e76bc14ffa7a14d13732459ecd1c8fd3211bfb717ac2eb3de4d40fda8a9c4b
