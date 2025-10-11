import {
  bchAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAssetId,
  ltcAssetId,
  mayachainAssetId,
  solAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { uniq } from 'lodash'

import { getSupportedEvmChainIds } from '@/lib/utils/evm'

/*
  The top-level fee assets supported by GridPlus, which can be mapped to specific firmware support.
  The Ethereum app supports all EVM chains, so we don't need to list them all here.
  GridPlus supports a similar set of chains to Ledger through its SafeCard firmware.
*/
export const availableGridPlusAppAssetIds = [
  btcAssetId,
  dogeAssetId,
  bchAssetId,
  ltcAssetId,
  ethAssetId,
  thorchainAssetId,
  cosmosAssetId,
  solAssetId,
  mayachainAssetId,
]

export const availableGridPlusAppChainIds = availableGridPlusAppAssetIds.map(
  assetId => fromAssetId(assetId).chainId,
)

// Adds the specific EVM chains supported by GridPlus so we can display them in the account management UI
export const availableGridPlusChainIds = uniq([
  ...availableGridPlusAppChainIds,
  ...getSupportedEvmChainIds(),
])
