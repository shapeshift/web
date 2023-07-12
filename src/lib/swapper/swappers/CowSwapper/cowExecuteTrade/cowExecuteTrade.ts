import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { SignMessageInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignMessage } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { ExecuteTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowChainId } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { CowTrade, CowTradeResult } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_SETTLEMENT_ADDRESS,
  DEFAULT_APP_DATA,
  ERC20_TOKEN_BALANCE,
  ORDER_KIND_SELL,
  SIGNING_SCHEME,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import type { CowSwapOrder } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  assertValidTrade,
  domain,
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
  getSupportedChainIds,
  hashOrder,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import { isEvmChainAdapter } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'

export async function cowExecuteTrade<T extends CowChainId>({
  trade,
  wallet,
}: ExecuteTradeInput<T>): Promise<Result<CowTradeResult, SwapErrorRight>> {
  const cowTrade = trade as CowTrade<T>
  const supportedChainIds = getSupportedChainIds()
  const {
    feeAmountInSellTokenCryptoBaseUnit: feeAmountInSellToken,
    sellAmountDeductFeeCryptoBaseUnit: sellAmountWithoutFee,
    buyAsset,
    accountNumber,
    id,
    minimumBuyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    receiveAddress,
  } = cowTrade

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(sellAsset.chainId)

  if (!isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: '[CowSwap: executeTrade] - invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { adapter },
      }),
    )
  }

  const assertion = assertValidTrade({ buyAsset, sellAsset, supportedChainIds, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyToken = !isNativeEvmAsset(buyAsset.assetId)
    ? fromAssetId(buyAsset.assetId).assetReference
    : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

  const orderToSign: CowSwapOrder = {
    sellToken: fromAssetId(sellAsset.assetId).assetReference,
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

  const { chainReference } = fromChainId(sellAsset.chainId)
  const signingDomain = Number(chainReference)

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

  const maybeSignatureOrderDigest = await (async () => {
    try {
      const signatureOrderDigest = await adapter.signMessage(message)
      return Ok(signatureOrderDigest)
    } catch (err) {
      return Err(
        makeSwapErrorRight({
          message: '[CowSwap: executeTrade] - failed to sign message',
          cause: err,
          code: SwapErrorType.EXECUTE_TRADE_FAILED,
          details: { message },
        }),
      )
    }
  })()

  if (maybeSignatureOrderDigest.isErr()) return Err(maybeSignatureOrderDigest.unwrapErr())
  const signatureOrderDigest = maybeSignatureOrderDigest.unwrap()

  // Passing the signature through split/join to normalize the `v` byte.
  // Some wallets do not pad it with `27`, which causes a signature failure
  // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
  const signature = ethers.utils.joinSignature(ethers.utils.splitSignature(signatureOrderDigest))

  const maybeNetwork = getCowswapNetwork(sellAsset.chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())

  const network = maybeNetwork.unwrap()
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

  if (maybeOrdersResponse.isErr()) return Err(maybeOrdersResponse.unwrapErr())
  const { data: tradeId } = maybeOrdersResponse.unwrap()

  return Ok({ tradeId, chainId: sellAsset.chainId })
}
