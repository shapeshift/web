import {
  bchAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAssetId,
  ltcAssetId,
  solAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { uniq } from 'lodash'
import { getSupportedEvmChainIds } from 'lib/utils/evm'

export const LEDGER_DEVICE_ID = '0001'

/*
  The top-level fee assets supported by Ledger, which can be mapped to a specific Ledger app.
  The Ethereum app supports all EVM chains, so we don't need to list them all here.
*/
export const availableLedgerAppAssetIds = [
  btcAssetId,
  dogeAssetId,
  bchAssetId,
  ltcAssetId,
  ethAssetId,
  thorchainAssetId,
  cosmosAssetId,
  solAssetId,
]

export const availableLedgerAppChainIds = availableLedgerAppAssetIds.map(
  assetId => fromAssetId(assetId).chainId,
)

// Adds the specific EVM chains supported by the Ledger Ethereum app so we can display them in the account management UI
export const availableLedgerChainIds = uniq([
  ...availableLedgerAppChainIds,
  ...getSupportedEvmChainIds(),
])
