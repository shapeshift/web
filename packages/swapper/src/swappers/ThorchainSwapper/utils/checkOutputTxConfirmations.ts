import type { StandardTx } from '@shapeshiftmonorepo/unchained-client'
import { assertUnreachable } from '@shapeshiftmonorepo/utils'
import axios from 'axios'

import type { SwapperConfig } from '../../../types'
import type { ThorNodeTxSchema } from '../types'
import { ThorchainChain } from '../types'

export const checkOutputTxConfirmations = async (
  buyTxHash: string,
  latestOutTx: ThorNodeTxSchema | undefined,
  config: SwapperConfig,
) => {
  if (!latestOutTx) return

  const apiUrl = (() => {
    switch (latestOutTx.chain) {
      case ThorchainChain.BTC: {
        return config.VITE_UNCHAINED_BITCOIN_HTTP_URL
      }
      case ThorchainChain.DOGE: {
        return config.VITE_UNCHAINED_DOGECOIN_HTTP_URL
      }
      case ThorchainChain.LTC: {
        return config.VITE_UNCHAINED_LITECOIN_HTTP_URL
      }
      case ThorchainChain.BCH: {
        return config.VITE_UNCHAINED_BITCOINCASH_HTTP_URL
      }
      case ThorchainChain.ETH: {
        return config.VITE_UNCHAINED_ETHEREUM_HTTP_URL
      }
      case ThorchainChain.AVAX: {
        return config.VITE_UNCHAINED_AVALANCHE_HTTP_URL
      }
      case ThorchainChain.BNB: {
        return config.VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL
      }
      case ThorchainChain.THOR: {
        return config.VITE_UNCHAINED_THORCHAIN_HTTP_URL
      }
      case ThorchainChain.GAIA: {
        return config.VITE_UNCHAINED_COSMOS_HTTP_URL
      }
      case ThorchainChain.BASE: {
        return config.VITE_UNCHAINED_BASE_HTTP_URL
      }
      case ThorchainChain.BSC:
        throw Error(`${latestOutTx.chain} not supported`)
      default:
        return assertUnreachable(latestOutTx.chain)
    }
  })()

  // using a timeout because if unchained hasn't seen a tx it will hang until eventual 520
  const { data: txData } = await axios.get<StandardTx>(`${apiUrl}/api/v1/tx/${buyTxHash}`, {
    timeout: 2000,
  })

  return txData?.confirmations
}
