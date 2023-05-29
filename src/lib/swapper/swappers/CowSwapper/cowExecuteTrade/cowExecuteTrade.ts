import { ethAssetId } from '@shapeshiftoss/caip'
import type { SignMessageInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignMessage } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { ethers } from 'ethers'
import type { ExecuteTradeInput, SwapErrorRight, TradeResult } from 'lib/swapper/api'
import type { CowChainId, CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_ETH_MARKER_ADDRESS,
  COW_SWAP_SETTLEMENT_ADDRESS,
  DEFAULT_APP_DATA,
  ERC20_TOKEN_BALANCE,
  ORDER_KIND_SELL,
  SIGNING_SCHEME,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import type { CowSwapOrder } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  domain,
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
  hashOrder,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'

import { validateExecuteTrade } from '../utils/validator'

export async function cowExecuteTrade<T extends CowChainId>(
  { baseUrl: apiUrl, adapter }: CowSwapperDeps,
  { trade, wallet }: ExecuteTradeInput<T>,
): Promise<Result<TradeResult, SwapErrorRight>> {
  const cowTrade = trade as CowTrade<T>
  const network = getCowswapNetwork(adapter)
  const {
    feeAmountInSellTokenCryptoBaseUnit: feeAmountInSellToken,
    sellAmountDeductFeeCryptoBaseUnit: sellAmountWithoutFee,
    buyAsset,
    accountNumber,
    id,
    minimumBuyAmountAfterFeesCryptoBaseUnit,
  } = cowTrade

  const maybeValidTradePair = validateExecuteTrade(cowTrade)
  maybeValidTradePair.isErr() && Err(maybeValidTradePair.unwrapErr())

  const { sellAssetAddress, buyAssetAddress } = maybeValidTradePair.unwrap()

  const buyToken = buyAsset.assetId !== ethAssetId ? buyAssetAddress : COW_SWAP_ETH_MARKER_ADDRESS

  const orderToSign: CowSwapOrder = {
    sellToken: sellAssetAddress,
    buyToken,
    sellAmount: sellAmountWithoutFee,
    buyAmount: minimumBuyAmountAfterFeesCryptoBaseUnit, // this is used as the minimum accepted receive amount before the trade will execute
    validTo: getNowPlusThirtyMinutesTimestamp(),
    appData: DEFAULT_APP_DATA,
    feeAmount: feeAmountInSellToken,
    kind: ORDER_KIND_SELL,
    partiallyFillable: false,
    receiver: trade.receiveAddress,
    sellTokenBalance: ERC20_TOKEN_BALANCE,
    buyTokenBalance: ERC20_TOKEN_BALANCE,
    quoteId: id,
  }

  // We need to construct orderDigest, sign it and send it to cowSwap API, in order to submit a trade
  // Some context about this : https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/4.-signing-the-order
  // For more info, check hashOrder method implementation
  const orderDigest = hashOrder(domain(1, COW_SWAP_SETTLEMENT_ADDRESS), orderToSign)

  const bip44Params = adapter.getBIP44Params({ accountNumber })
  const message: SignMessageInput<ETHSignMessage> = {
    messageToSign: {
      addressNList: toAddressNList(bip44Params),
      message: ethers.utils.arrayify(orderDigest),
    },
    wallet,
  }

  const signatureOrderDigest = await adapter.signMessage(message)

  // Passing the signature through split/join to normalize the `v` byte.
  // Some wallets do not pad it with `27`, which causes a signature failure
  // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
  const signature = ethers.utils.joinSignature(ethers.utils.splitSignature(signatureOrderDigest))

  /**
   * /v1/orders
   * params: {
   * sellToken: contract address of token to sell
   * buyToken: contractAddress of token to buy
   * receiver: receiver address
   * validTo: time duration during which order is valid (putting current timestamp + 30 minutes for real order)
   * appData: appData that can be used later, can be defaulted to "0x0000000000000000000000000000000000000000000000000000000000000000"
   * partiallyFillable: false
   * from: sender address
   * kind: "sell" or "buy"
   * feeAmount: amount of fee in sellToken base
   * sellTokenBalance: "erc20" string,
   * buyTokenBalance: "erc20" string,
   * signingScheme: the signing scheme used for the signature
   * signature: a signed message specific to cowswap for this order
   * from: same as receiver address in our case
   * orderId: Orders can optionally include a quote ID. This way the order can be linked to a quote and enable providing more metadata when analyzing order slippage.
   * }
   */
  const maybeOrdersResponse = await cowService.post<string>(`${apiUrl}/${network}/api/v1/orders/`, {
    ...orderToSign,
    signingScheme: SIGNING_SCHEME,
    signature,
    from: trade.receiveAddress,
  })

  return maybeOrdersResponse.andThen(({ data: tradeId }) => Ok({ tradeId }))
}
