import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { zeroAddress } from 'viem'

import type { SupportedChainIds } from '../../../types'

export const DEFAULT_ADDRESS = zeroAddress

export const COW_SWAP_VAULT_RELAYER_ADDRESS = '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110'
export const COW_SWAP_SETTLEMENT_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'

export const ORDER_KIND_SELL = 'sell'
export const SIGNING_SCHEME = 'ethsign'
export const ERC20_TOKEN_BALANCE = 'erc20'

// Address used by CowSwap to buy ETH
// See https://github.com/gnosis/gp-v2-contracts/commit/821b5a8da213297b0f7f1d8b17c893c5627020af#diff-12bbbe13cd5cf42d639e34a39d8795021ba40d3ee1e1a8282df652eb161a11d6R13
export const COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const SUPPORTED_CHAIN_IDS: ChainId[] = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.ArbitrumMainnet,
].filter(chainId => {
  if (
    process.env['REACT_APP_FEATURE_COWSWAP_GNOSIS'] !== 'true' &&
    chainId === KnownChainIds.GnosisMainnet
  ) {
    return false
  }

  if (
    process.env['REACT_APP_FEATURE_COWSWAP_ARBITRUM'] !== 'true' &&
    chainId === KnownChainIds.ArbitrumMainnet
  ) {
    return false
  }

  return true
})

export const COW_SWAP_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: SUPPORTED_CHAIN_IDS,
  buy: SUPPORTED_CHAIN_IDS,
}
