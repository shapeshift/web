import { Erc20Bridger, EthBridger, getL2Network } from '@arbitrum/sdk'
import type { L1ToL2TransactionRequest } from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
import { bn } from 'lib/bignumber/bignumber'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertGetEvmChainAdapter, getFees } from 'lib/utils/evm'

import { assertValidTrade } from '../utils/helpers'

const fetchTokenFallbackGasEstimates = () =>
  // https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L45-L51
  // Use hardcoded gas estimate values
  // Values set by looking at a couple of different ERC-20 deposits
  bn(240_000)

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
  const adapter = assertGetEvmChainAdapter(chainId)

  // TODO(gomes): don't hardcode me
  const l2Network = await getL2Network(42161)

  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  const bridger = isEthBridge ? new EthBridger(l2Network) : new Erc20Bridger(l2Network)

  if (!(isEvmChainId(sellAsset.chainId) && isEvmChainId(buyAsset.chainId))) {
    throw new Error(`Arbitrum Bridge only supports EVM chains`)
  }

  const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference
  const l1Provider = getEthersV5Provider(sellAsset.chainId)
  const l2Provider = getEthersV5Provider(buyAsset.chainId)

  // TODO(gomes): isApprovalRequired
  if (isDeposit && !isEthBridge) {
    const estimatedParentChainGas = fetchTokenFallbackGasEstimates()
    const allowanceContract = await (bridger as Erc20Bridger).getL1GatewayAddress(
      erc20L1Address,
      l1Provider,
    )

    const { fast } = await adapter.getGasFeeData()

    return Ok({
      id: uuid(),
      receiveAddress,
      affiliateBps,
      potentialAffiliateBps,
      rate: '1',
      slippageTolerancePercentageDecimal:
        input.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ArbitrumBridge),
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract,
          rate: '1',
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: estimatedParentChainGas.times(fast.gasPrice).toString(),
          },
          source: SwapperName.ArbitrumBridge,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  }

  const request = await (isDeposit
    ? bridger.getDepositRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        erc20L1Address,
        l1Provider,
        l2Provider,
        from: sendAddress ?? '',
      })
    : bridger.getWithdrawalRequest({
        amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        // This isn't a typo - https://github.com/OffchainLabs/arbitrum-sdk/pull/474
        erc20l1Address: erc20L1Address,
        destinationAddress: receiveAddress ?? '',
        from: sendAddress ?? '',
      }))

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const buyAmountBeforeFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit
  const buyAmountAfterFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit

  // 1/1 when bridging on Arbitrum bridge
  const rate = '1'

  const allowanceContract = (request as L1ToL2TransactionRequest).retryableData?.from || '0x0' // no allowance needed for ETH deposits

  const feeData = await getFees({
    adapter,
    data: request.txRequest.data.toString(),
    to: request.txRequest.to,
    value: request.txRequest.value.toString(),
    from: request.txRequest.from,
    supportsEIP1559,
  })

  try {
    const networkFeeCryptoBaseUnit = feeData.networkFeeCryptoBaseUnit
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
