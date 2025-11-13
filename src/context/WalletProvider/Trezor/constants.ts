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

export const supportedTrezorAssetIds = [
  btcAssetId,
  dogeAssetId,
  bchAssetId,
  ltcAssetId,
  ethAssetId,
  solAssetId,
]

export const supportedTrezorChainIds = uniq([
  ...supportedTrezorAssetIds.map(assetId => fromAssetId(assetId).chainId),
  ...getSupportedEvmChainIds(),
])
