import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { BuildTradeInput, SwapError, SwapErrorTypes } from '../../../api'
import { erc20AllowanceAbi } from '../../utils/abi/erc20Allowance-abi'
import { bn, bnOrZero } from '../../utils/bignumber'
import {
  getAllowanceRequired,
  getApproveContractData,
  normalizeAmount,
} from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
import { CowSwapQuoteResponse, CowTrade } from '../types'
import {
  COW_SWAP_ETH_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import { getNowPlusThirtyMinutesTimestamp } from '../utils/helpers/helpers'

export async function cowBuildTrade(
  deps: CowSwapperDeps,
  input: BuildTradeInput,
): Promise<CowTrade<KnownChainIds.EthereumMainnet>> {
  try {
    const { sellAsset, buyAsset, sellAmount, bip44Params, wallet } = input
    const { adapter, web3 } = deps

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const { assetReference: buyAssetErc20Address, chainId: buyAssetChainId } = fromAssetId(
      buyAsset.assetId,
    )

    if (sellAssetNamespace !== 'erc20') {
      throw new SwapError('[cowBuildTrade] - Sell asset needs to be ERC-20 to use CowSwap', {
        code: SwapErrorTypes.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace },
      })
    }

    if (buyAssetChainId !== KnownChainIds.EthereumMainnet) {
      throw new SwapError('[cowBuildTrade] - Buy asset needs to be on ETH mainnet to use CowSwap', {
        code: SwapErrorTypes.UNSUPPORTED_PAIR,
        details: { buyAssetChainId },
      })
    }

    const buyToken =
      buyAsset.assetId !== ethAssetId ? buyAssetErc20Address : COW_SWAP_ETH_MARKER_ADDRESS
    const receiveAddress = await adapter.getAddress({ wallet })
    const normalizedSellAmount = normalizeAmount(sellAmount)

    /**
     * /v1/quote
     * params: {
     * sellToken: contract address of token to sell
     * buyToken: contractAddress of token to buy
     * receiver: receiver address can be defaulted to "0x0000000000000000000000000000000000000000"
     * validTo: time duration during which quote is valid (eg : 1654851610 as timestamp)
     * appData: appData for the CowSwap quote that can be used later, can be defaulted to "0x0000000000000000000000000000000000000000000000000000000000000000"
     * partiallyFillable: false
     * from: sender address can be defaulted to "0x0000000000000000000000000000000000000000"
     * kind: "sell" or "buy"
     * sellAmountBeforeFee / buyAmountAfterFee: amount in base unit
     * }
     */
    const quoteResponse: AxiosResponse<CowSwapQuoteResponse> =
      await cowService.post<CowSwapQuoteResponse>(`${deps.apiUrl}/v1/quote/`, {
        sellToken: sellAssetErc20Address,
        buyToken,
        receiver: receiveAddress,
        validTo: getNowPlusThirtyMinutesTimestamp(),
        appData: DEFAULT_APP_DATA,
        partiallyFillable: false,
        from: receiveAddress,
        kind: ORDER_KIND_SELL,
        sellAmountBeforeFee: normalizedSellAmount,
      })

    const {
      data: { quote },
    } = quoteResponse

    const buyCryptoAmount = bn(quote.buyAmount).div(bn(10).exponentiatedBy(buyAsset.precision))
    const sellCryptoAmount = bn(quote.sellAmount).div(bn(10).exponentiatedBy(sellAsset.precision))
    const rate = buyCryptoAmount.div(sellCryptoAmount).toString()

    const data = getApproveContractData({
      web3,
      spenderAddress: COW_SWAP_VAULT_RELAYER_ADDRESS,
      contractAddress: sellAssetErc20Address,
    })

    const feeDataOptions = await adapter.getFeeData({
      to: sellAssetErc20Address,
      value: '0',
      chainSpecific: { from: receiveAddress, contractData: data },
    })

    const feeData = feeDataOptions['fast']

    const trade: CowTrade<KnownChainIds.EthereumMainnet> = {
      rate,
      feeData: {
        fee: '0', // no miner fee for CowSwap
        chainSpecific: {
          estimatedGas: feeData.chainSpecific.gasLimit,
          gasPrice: feeData.chainSpecific.gasPrice,
        },
        tradeFee: '0', // Trade fees for buy Asset are always 0 since trade fees are subtracted from sell asset
      },
      sellAmount: normalizedSellAmount,
      buyAmount: quote.buyAmount,
      sources: DEFAULT_SOURCE,
      buyAsset,
      sellAsset,
      bip44Params,
      receiveAddress,
      feeAmountInSellToken: quote.feeAmount,
      sellAmountWithoutFee: quote.sellAmount,
    }

    const allowanceRequired = await getAllowanceRequired({
      adapter,
      sellAsset,
      allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
      receiveAddress,
      sellAmount: quote.sellAmount,
      web3: deps.web3,
      erc20AllowanceAbi,
    })

    if (!allowanceRequired.isZero()) {
      trade.feeData.chainSpecific.approvalFee = bnOrZero(feeData.chainSpecific.gasLimit)
        .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
        .toString()
    }

    return trade
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[cowBuildTrade]', {
      cause: e,
      code: SwapErrorTypes.TRADE_QUOTE_FAILED,
    })
  }
}
