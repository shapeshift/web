import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import {
  DAO_TREASURY_BASE,
  DAO_TREASURY_BITCOIN,
  DAO_TREASURY_STARKNET,
} from '@shapeshiftoss/utils'

export const GARDEN_API_BASE_URL = 'https://api.garden.finance/v2'

export const GARDEN_API_KEY_HEADER = 'garden-app-id'

export const GARDEN_AFFILIATE_FEE_ASSET = 'base:cbbtc' as const
export const GARDEN_AFFILIATE_FEE_RECIPIENT = DAO_TREASURY_BASE

const GARDEN_EVM_FEE_PLACEHOLDER = '0x000000000000000000000000000000000000dead'

export const GARDEN_FEE_PLACEHOLDER_BY_NAMESPACE: Record<string, string> = {
  [CHAIN_NAMESPACE.Utxo]: DAO_TREASURY_BITCOIN,
  [CHAIN_NAMESPACE.Evm]: GARDEN_EVM_FEE_PLACEHOLDER,
  [CHAIN_NAMESPACE.Starknet]: DAO_TREASURY_STARKNET,
}
