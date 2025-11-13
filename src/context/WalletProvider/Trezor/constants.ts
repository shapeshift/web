import {
  bchAssetId,
  btcAssetId,
  dogeAssetId,
  ethAssetId,
  fromAssetId,
  ltcAssetId,
  solAssetId,
} from '@shapeshiftoss/caip'
import { uniq } from 'lodash'

import { getSupportedEvmChainIds } from '@/lib/utils/evm'

export const TREZOR_DEVICE_ID = '0002'

export const availableTrezorAppAssetIds = [
  btcAssetId,
  dogeAssetId,
  bchAssetId,
  ltcAssetId,
  ethAssetId,
  solAssetId,
]

export const availableTrezorAppChainIds = availableTrezorAppAssetIds.map(
  assetId => fromAssetId(assetId).chainId,
)

export const availableTrezorChainIds = uniq([
  ...availableTrezorAppChainIds,
  ...getSupportedEvmChainIds(),
])
