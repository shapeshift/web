import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { CowSwapQuoteResponse, CowTrade } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_ETH_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import {
  getNowPlusThirtyMinutesTimestamp,
  getUsdRate,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import {
  getApproveContractData,
  isApprovalRequired,
} from 'lib/swapper/swappers/utils/helpers/helpers'

export async function cowBuildTrade(
  deps: CowSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<CowTrade<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
  try {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountExcludeFeeCryptoBaseUnit,
      accountNumber,
      wallet,
    } = input
    const { adapter, web3 } = deps

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const { assetReference: buyAssetErc20Address, chainId: buyAssetChainId } = fromAssetId(
      buyAsset.assetId,
    )

    if (sellAssetNamespace !== 'erc20') {
      return Err(
        makeSwapErrorRight({
          message: '[cowBuildTrade] - Sell asset needs to be ERC-20 to use CowSwap',
          code: SwapErrorType.UNSUPPORTED_PAIR,
          details: { sellAssetNamespace },
        }),
      )
    }

    if (buyAssetChainId !== KnownChainIds.EthereumMainnet) {
      return Err(
        makeSwapErrorRight({
          message: '[cowBuildTrade] - Buy asset needs to be on ETH mainnet to use CowSwap',
          code: SwapErrorType.UNSUPPORTED_PAIR,
          details: { buyAssetChainId },
        }),
      )
    }

    const buyToken =
      buyAsset.assetId !== ethAssetId ? buyAssetErc20Address : COW_SWAP_ETH_MARKER_ADDRESS
    const receiveAddress = await adapter.getAddress({ accountNumber, wallet })

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
    const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
      `${deps.apiUrl}/v1/quote/`,
      {
        sellToken: sellAssetErc20Address,
        buyToken,
        receiver: receiveAddress,
        validTo: getNowPlusThirtyMinutesTimestamp(),
        appData: DEFAULT_APP_DATA,
        partiallyFillable: false,
        from: receiveAddress,
        kind: ORDER_KIND_SELL,
        sellAmountBeforeFee: sellAmountExcludeFeeCryptoBaseUnit,
      },
    )

    if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())

    const {
      data: {
        quote: {
          buyAmount: buyAmountCryptoBaseUnit,
          sellAmount: quoteSellAmountExcludeFeeCryptoBaseUnit,
          feeAmount: feeAmountInSellTokenCryptoBaseUnit,
        },
      },
    } = maybeQuoteResponse.unwrap()

    const maybeSellAssetUsdRate = await getUsdRate(deps, sellAsset)
    if (maybeSellAssetUsdRate.isErr()) return Err(maybeSellAssetUsdRate.unwrapErr())
    const sellAssetUsdRate = maybeSellAssetUsdRate.unwrap()

    const sellAssetTradeFeeUsd = bnOrZero(feeAmountInSellTokenCryptoBaseUnit)
      .div(bn(10).exponentiatedBy(sellAsset.precision))
      .multipliedBy(bnOrZero(sellAssetUsdRate))
      .toString()

    const buyAmountCryptoPrecision = bn(buyAmountCryptoBaseUnit).div(
      bn(10).exponentiatedBy(buyAsset.precision),
    )
    const quoteSellAmountCryptoPrecision = bn(quoteSellAmountExcludeFeeCryptoBaseUnit).div(
      bn(10).exponentiatedBy(sellAsset.precision),
    )
    const rate = buyAmountCryptoPrecision.div(quoteSellAmountCryptoPrecision).toString()

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
        networkFeeCryptoBaseUnit: '0', // no miner fee for CowSwap
        chainSpecific: {
          estimatedGasCryptoBaseUnit: feeData.chainSpecific.gasLimit,
          gasPriceCryptoBaseUnit: feeData.chainSpecific.gasPrice,
        },
        buyAssetTradeFeeUsd: '0', // Trade fees for buy Asset are always 0 since trade fees are subtracted from sell asset
        sellAssetTradeFeeUsd,
      },
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountExcludeFeeCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sources: DEFAULT_SOURCE,
      buyAsset,
      sellAsset,
      accountNumber,
      receiveAddress,
      feeAmountInSellTokenCryptoBaseUnit,
      sellAmountDeductFeeCryptoBaseUnit: quoteSellAmountExcludeFeeCryptoBaseUnit,
    }

    const approvalRequired = await isApprovalRequired({
      adapter,
      sellAsset,
      allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
      receiveAddress,
      sellAmountExcludeFeeCryptoBaseUnit,
      web3: deps.web3,
      erc20AllowanceAbi,
    })

    if (approvalRequired) {
      trade.feeData.chainSpecific.approvalFeeCryptoBaseUnit = bnOrZero(
        feeData.chainSpecific.gasLimit,
      )
        .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
        .toString()
    }

    return Ok(trade)
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[cowBuildTrade]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
