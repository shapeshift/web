import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { zeroAddress } from 'viem'

export const ORDER_TYPE_FIELDS = [
  { name: 'sellToken', type: 'address' },
  { name: 'buyToken', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'sellAmount', type: 'uint256' },
  { name: 'buyAmount', type: 'uint256' },
  { name: 'validTo', type: 'uint32' },
  { name: 'appData', type: 'bytes32' },
  { name: 'feeAmount', type: 'uint256' },
  { name: 'kind', type: 'string' },
  { name: 'partiallyFillable', type: 'bool' },
  { name: 'sellTokenBalance', type: 'string' },
  { name: 'buyTokenBalance', type: 'string' },
]

export const CANCELLATIONS_TYPE_FIELDS = [{ name: 'orderUids', type: 'bytes[]' }]

export const DEFAULT_ADDRESS = zeroAddress

export const SUPPORTED_CHAIN_IDS: ChainId[] = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.PolygonMainnet,
]

export const COW_SWAP_VAULT_RELAYER_ADDRESS = '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110'
export const COW_SWAP_SETTLEMENT_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'

// Address used by CowSwap to buy ETH
// See https://github.com/gnosis/gp-v2-contracts/commit/821b5a8da213297b0f7f1d8b17c893c5627020af#diff-12bbbe13cd5cf42d639e34a39d8795021ba40d3ee1e1a8282df652eb161a11d6R13
export const COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
