import type { StandardTx } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import { getConfig } from 'config'
import { assertUnreachable } from 'lib/utils'

import type { ThorNodeTxSchema } from '../types'
import { ThorchainChain } from '../types'

export const checkOutboundTxConfirmations = async (
  buyTxHash: string,
  latestOutTx: ThorNodeTxSchema | undefined,
) => {
  if (!latestOutTx) return

  const apiUrl = (() => {
    switch (latestOutTx.chain) {
      case ThorchainChain.BTC: {
        return getConfig().REACT_APP_UNCHAINED_BITCOIN_HTTP_URL
      }
      case ThorchainChain.DOGE: {
        return getConfig().REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL
      }
      case ThorchainChain.LTC: {
        return getConfig().REACT_APP_UNCHAINED_LITECOIN_HTTP_URL
      }
      case ThorchainChain.BCH: {
        return getConfig().REACT_APP_UNCHAINED_BITCOINCASH_HTTP_URL
      }
      case ThorchainChain.ETH: {
        return getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL
      }
      case ThorchainChain.AVAX: {
        return getConfig().REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL
      }
      case ThorchainChain.BNB: {
        return getConfig().REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL
      }
      case ThorchainChain.THOR: {
        return getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL
      }
      case ThorchainChain.GAIA: {
        return getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL
      }
      case ThorchainChain.BSC:
        throw Error(`${latestOutTx.chain} not supported`)
      default:
        assertUnreachable(latestOutTx.chain)
    }
  })()

  // using a timeout because if unchained hasn't seen a tx it will hang until eventual 520
  const { data: txData } = await axios.get<StandardTx>(`${apiUrl}/api/v1/tx/${buyTxHash}`, {
    timeout: 2000,
  })

  return txData?.confirmations
}
