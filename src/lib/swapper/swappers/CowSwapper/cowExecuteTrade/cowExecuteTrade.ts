import { fromAssetId } from '@shapeshiftoss/caip'
import type { SignMessageInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignMessage } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import { method } from 'lodash'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { ExecuteTradeInput, SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowChainId } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
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
import { isEvmChainAdapter } from 'lib/utils'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { getSigningDomainFromChainId, isCowswapSupportedChainId } from '../utils/utils'

export async function cowExecuteTrade<T extends CowChainId>(
  { trade, wallet }: ExecuteTradeInput<T>,
  supportedChainIds: KnownChainIds[],
): Promise<Result<TradeResult, SwapErrorRight>> {
  const cowTrade = trade as CowTrade<T>
  const {
    feeAmountInSellTokenCryptoBaseUnit: feeAmountInSellToken,
    sellAmountDeductFeeCryptoBaseUnit: sellAmountWithoutFee,
    buyAsset,
    accountNumber,
    id,
    minimumBuyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
  } = cowTrade

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(sellAsset.chainId)

  if (!adapter || !isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { adapter },
      }),
    )
  }

  const maybeNetwork = getCowswapNetwork(sellAsset.chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())
  const network = maybeNetwork.unwrap()

  const {
    assetReference: sellAssetAddress,
    assetNamespace: sellAssetNamespace,
    chainId: sellAssetChainId,
  } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddress, chainId: buyAssetChainId } = fromAssetId(
    buyAsset.assetId,
  )

  if (sellAssetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: `[${method}] - Both assets needs to be ERC-20 to use CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace },
      }),
    )
  }

  if (
    !(
      isCowswapSupportedChainId(buyAssetChainId, supportedChainIds) &&
      buyAssetChainId === sellAssetChainId
    )
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[${method}] - Both assets need to be on a network supported by CowSwap`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAssetChainId },
      }),
    )
  }

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? buyAssetAddress
    : COW_SWAP_ETH_MARKER_ADDRESS

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

  const maybeValidSigningDomain = getSigningDomainFromChainId(sellAsset.chainId)
  maybeValidSigningDomain.isErr() && Err(maybeValidSigningDomain.unwrapErr())
  const signingDomain = maybeValidSigningDomain.unwrap()

  // We need to construct orderDigest, sign it and send it to cowSwap API, in order to submit a trade
  // Some context about this : https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/4.-signing-the-order
  // For more info, check hashOrder method implementation
  const orderDigest = hashOrder(domain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS), orderToSign)

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
  const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL
  const maybeOrdersResponse = await cowService.post<string>(
    `${baseUrl}/${network}/api/v1/orders/`,
    {
      ...orderToSign,
      signingScheme: SIGNING_SCHEME,
      signature,
      from: trade.receiveAddress,
    },
  )

  return maybeOrdersResponse.andThen(({ data: tradeId }) => Ok({ tradeId }))
}
