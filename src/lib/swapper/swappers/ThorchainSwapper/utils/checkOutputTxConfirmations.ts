import type { ThorNodeStatusResponseSuccess } from '@shapeshiftoss/types'
import { ThorchainChain } from '@shapeshiftoss/types'
import type { StandardTx } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import { getConfig } from 'config'
import { assertUnreachable } from 'lib/utils'

export const checkOutboundTxConfirmations = async (
  thorTxData: ThorNodeStatusResponseSuccess,
  buyTxHash: string,
) => {
  const outCoinChain: ThorchainChain | undefined = thorTxData.out_txs?.[0]?.chain

  if (!outCoinChain) return

  const apiUrl = (() => {
    switch (outCoinChain) {
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
        throw Error(`${outCoinChain} not supported`)
      default:
        assertUnreachable(outCoinChain)
    }
  })()

  // using a timeout because if unchained hasn't seen a tx it will hang until eventual 520
  const { data: txData } = await axios.get<StandardTx>(`${apiUrl}/api/v1/tx/${buyTxHash}`, {
    timeout: 2000,
  })

  return txData?.confirmations
}
