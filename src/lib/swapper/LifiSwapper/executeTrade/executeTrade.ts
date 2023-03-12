import type { TradeResult } from '@shapeshiftoss/swapper'
import type { Signer } from 'ethers'
import { providers } from 'ethers'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput } from 'lib/swapper/LifiSwapper/utils/types'

export const executeTrade = async ({ trade }: LifiExecuteTradeInput): Promise<TradeResult> => {
  const lifi = getLifi()

  // TODO: error message
  if (window.ethereum === undefined) throw Error()

  // TODO: investigate alternatives if required:
  // - [preferred] somehow get Signer from HDWallet (`wallet` in ExecuteTradeInput)
  // - singleton by chainId using `new providers.Web3Provider(window.ethereum)`, similar to `src/lib/web3-provider.ts
  // cannot use `lifi.getRpcProvider(chainId)` because it return a FallbackProvider which is not instanceof JsonRpcProvider and dones have `getSigner` method
  // at minimum this should be a singleton so the provider can maintain state
  const web3Provider = new providers.Web3Provider(window.ethereum)
  const signer: Signer = web3Provider.getSigner()

  const { id } = await lifi.executeRoute(signer, trade.route, { executeInBackground: true })

  // TODO: dont return the route ID, instead return array of tx IDs - 1 for each step.
  // https://lifihelp.zendesk.com/hc/en-us/articles/12111247166363-How-to-get-the-tx-hash-once-a-swap-starts-executing-when-using-the-SDK-via-executeRoute-
  return { tradeId: id }
}
