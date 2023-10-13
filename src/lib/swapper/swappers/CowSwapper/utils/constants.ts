import type { LatestAppDataDocVersion } from '@cowprotocol/app-data'
import { MetadataApi, stringifyDeterministic } from '@cowprotocol/app-data'
import type { OrderClass } from '@cowprotocol/app-data/dist/generatedTypes/v0.9.0'
import { AddressZero } from '@ethersproject/constants'
import { KnownChainIds } from '@shapeshiftoss/types'
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils.js'

import type { CowChainId } from '../types'

export const metadataApi = new MetadataApi()

export const MIN_COWSWAP_USD_TRADE_VALUES_BY_CHAIN_ID: Record<CowChainId, string> = {
  [KnownChainIds.EthereumMainnet]: '20',
  [KnownChainIds.GnosisMainnet]: '0.01',
}

export const DEFAULT_ADDRESS = AddressZero

type AppDataInfo = {
  doc: LatestAppDataDocVersion
  fullAppData: string
  appDataKeccak256: string
  env?: string
}

const generateAppDataFromDoc = async (
  doc: LatestAppDataDocVersion,
): Promise<Pick<AppDataInfo, 'fullAppData' | 'appDataKeccak256'>> => {
  const appData = await stringifyDeterministic(doc)
  const appDataKeccak256 = keccak256(toUtf8Bytes(appData))

  return { fullAppData: appData, appDataKeccak256 }
}

//
// See https://api.cow.fi/docs/#/default/post_api_v1_quote / https://github.com/cowprotocol/app-data
export const getFullAppData = async () => {
  const APP_CODE = 'shapeshift'
  const orderClass: OrderClass = { orderClass: 'market' }
  const quote = { slippageBips: '50' }

  const appDataDoc = await metadataApi.generateAppDataDoc({
    appCode: APP_CODE,
    metadata: {
      quote,
      orderClass,
    },
  })

  const { fullAppData, appDataKeccak256 } = await generateAppDataFromDoc(appDataDoc)
  return { appDataHash: appDataKeccak256, appData: fullAppData }
}
export const COW_SWAP_VAULT_RELAYER_ADDRESS = '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110'
export const COW_SWAP_SETTLEMENT_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'

export const ORDER_KIND_SELL = 'sell'
export const SIGNING_SCHEME = 'ethsign'
export const ERC20_TOKEN_BALANCE = 'erc20'

// Address used by CowSwap to buy ETH
// See https://github.com/gnosis/gp-v2-contracts/commit/821b5a8da213297b0f7f1d8b17c893c5627020af#diff-12bbbe13cd5cf42d639e34a39d8795021ba40d3ee1e1a8282df652eb161a11d6R13
export const COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
