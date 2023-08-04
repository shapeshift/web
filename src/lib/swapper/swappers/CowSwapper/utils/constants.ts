import { AddressZero } from '@ethersproject/constants'
import { KnownChainIds } from '@shapeshiftoss/types'
import { SwapperName } from 'lib/swapper/api'

import type { CowChainId } from '../types'

export const MIN_COWSWAP_USD_TRADE_VALUES_BY_CHAIN_ID: Record<CowChainId, string> = {
  [KnownChainIds.EthereumMainnet]: '20',
  [KnownChainIds.GnosisMainnet]: '0.01',
}

export const DEFAULT_SOURCE = [{ name: SwapperName.CowSwap, proportion: '1' }]
export const DEFAULT_ADDRESS = AddressZero
export const DEFAULT_APP_DATA = '0x68a7b5781dfe48bd5d7aeb11261c17517f5c587da682e4fade9b6a00a59b8970'
export const COW_SWAP_VAULT_RELAYER_ADDRESS = '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110'
export const COW_SWAP_SETTLEMENT_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'

export const ORDER_KIND_SELL = 'sell'
export const SIGNING_SCHEME = 'ethsign'
export const ERC20_TOKEN_BALANCE = 'erc20'

// Address used by CowSwap to buy ETH
// See https://github.com/gnosis/gp-v2-contracts/commit/821b5a8da213297b0f7f1d8b17c893c5627020af#diff-12bbbe13cd5cf42d639e34a39d8795021ba40d3ee1e1a8282df652eb161a11d6R13
export const COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
