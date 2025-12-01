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
  tronAssetId,
} from '@shapeshiftoss/caip'
import { uniq } from 'lodash'

import { getSupportedEvmChainIds } from '@/lib/utils/evm'

export const LEDGER_DEVICE_ID = '0001'
// https://github.com/LedgerHQ/ledger-live/blob/c2d2cbcd81fe46ac1967802b3770a05d805a4d0e/libs/ledgerjs/packages/devices/src/index.ts#L147-L161
export const LEDGER_VENDOR_ID = 0x2c97

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
  mayachainAssetId,
  tronAssetId,
]

export const availableLedgerAppChainIds = availableLedgerAppAssetIds.map(
  assetId => fromAssetId(assetId).chainId,
)

// Adds the specific EVM chains supported by the Ledger Ethereum app so we can display them in the account management UI
export const availableLedgerChainIds = uniq([
  ...availableLedgerAppChainIds,
  ...getSupportedEvmChainIds(),
])
