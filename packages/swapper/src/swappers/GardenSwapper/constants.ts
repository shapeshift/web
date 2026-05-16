import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import { DAO_TREASURY_BASE, DAO_TREASURY_STARKNET } from '@shapeshiftoss/utils'

export const GARDEN_API_BASE_URL = 'https://api.garden.finance/v2'

export const GARDEN_API_KEY_HEADER = 'garden-app-id'

export const GARDEN_AFFILIATE_FEE_ASSET = 'base:cbbtc' as const
export const GARDEN_AFFILIATE_FEE_RECIPIENT = DAO_TREASURY_BASE

const DEFAULT_GARDEN_EVM_DEAD_ADDRESS = '0x000000000000000000000000000000000000dead'
const DEFAULT_GARDEN_BITCOIN_DEAD_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'

export const GARDEN_DEAD_ADDRESS_BY_NAMESPACE: Record<string, string> = {
  [CHAIN_NAMESPACE.Utxo]: DEFAULT_GARDEN_BITCOIN_DEAD_ADDRESS,
  [CHAIN_NAMESPACE.Evm]: DEFAULT_GARDEN_EVM_DEAD_ADDRESS,
  [CHAIN_NAMESPACE.Starknet]: DAO_TREASURY_STARKNET,
}
