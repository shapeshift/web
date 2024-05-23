import { Erc20Bridger, getL2Network } from '@arbitrum/sdk'
import { fromAssetId } from '@shapeshiftoss/caip'
import type {
  GetEvmTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import {
  makeSwapErrorRight,
  type SwapErrorRight,
  SwapperName,
  TradeQuoteError,
} from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { BigNumber } from 'ethers5'
import { v4 as uuid } from 'uuid'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertGetEvmChainAdapter, calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'

import { assertValidTrade } from '../utils/helpers'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    potentialAffiliateBps,
    supportsEIP1559,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
  } = input
  // TODO(gomes): don't hardcode me
  const l2Network = await getL2Network(42161)
  const bridger = new Erc20Bridger(l2Network)

  const erc20L1Address = fromAssetId(sellAsset.assetId).assetReference
  const l1Provider = getEthersV5Provider(sellAsset.chainId)
  const l2Provider = getEthersV5Provider(buyAsset.chainId)

  // TODO(gomes): handle deposits/withdraws, ERC20s/ETH
  // TODO(gomes): this no work when approval is needed and we'll need to construct Txs manually
  // "SDKs suck, sink with it" - Elon Musk, 2024
  const request = await bridger.getDepositRequest({
    amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
    erc20L1Address,
    l1Provider,
    l2Provider,
    from: sendAddress ?? '',
  })

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyAmountBeforeFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit
  const buyAmountAfterFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit

  // 1/1 when bridging on Arbitrum bridge
  const rate = '1'

  const allowanceContract = request.retryableData.from

  try {
    // assert get is allowed because we chain chainId is an EVM chainId above in assertValidTrade
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      gasLimit: request.retryableData.gasLimit.toString(),
    })

    return Ok({
      id: uuid(),
      receiveAddress,
      affiliateBps,
      potentialAffiliateBps,
      rate,
      // slippage is a pass-thru for this swapper because it's actually inputted to 1inch when building the tx
      slippageTolerancePercentageDecimal:
        input.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ArbitrumBridge),
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
          },
          source: SwapperName.ArbitrumBridge,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[ArbitrumBridge: tradeQuote] - failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
