import { Erc20Bridger, EthBridger, getL2Network } from '@arbitrum/sdk'
import type { L1ToL2TransactionRequest } from '@arbitrum/sdk/dist/lib/dataEntities/transactionRequest'
import { ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
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
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { BigNumber } from 'ethers5'
import { v4 as uuid } from 'uuid'
import { arbitrum } from 'viem/chains'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { bn } from 'lib/bignumber/bignumber'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertGetEvmChainAdapter, getFees } from 'lib/utils/evm'

import { assertValidTrade } from '../utils/helpers'

const usdcOnArbitrumAssetId = 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831'

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
    supportsEIP1559,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
  } = input
  const assertion = await assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const adapter = assertGetEvmChainAdapter(chainId)

  const l2Network = await getL2Network(arbitrum.id)

  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  // 1/1 when bridging on Arbitrum bridge
  const rate = '1'

  try {
    if (isEthBridge) {
      const bridger = new EthBridger(l2Network)

      if (sellAsset.assetId === usdcAssetId || sellAsset.assetId === usdcOnArbitrumAssetId) {
        // https://www.circle.com/en/cross-chain-transfer-protocol
        throw new Error('cctp not implemented')
      }

      const request = await (isDeposit
        ? bridger.getDepositToRequest({
            amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
            l1Provider,
            l2Provider,
            from: sendAddress ?? '',
            destinationAddress: receiveAddress ?? '',
          })
        : bridger.getWithdrawalRequest({
            amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
            destinationAddress: receiveAddress ?? '',
            from: sendAddress ?? '',
          }))

      const buyAmountBeforeFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit
      const buyAmountAfterFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit

      const allowanceContract = '0x0' // no allowance needed for ETH

      const feeData = await getFees({
        adapter,
        data: request.txRequest.data.toString(),
        to: request.txRequest.to,
        value: request.txRequest.value.toString(),
        from: request.txRequest.from,
        supportsEIP1559,
      })

      const networkFeeCryptoBaseUnit = feeData.networkFeeCryptoBaseUnit
      return Ok({
        id: uuid(),
        receiveAddress,
        affiliateBps,
        potentialAffiliateBps: '0',
        rate,
        slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
          SwapperName.ArbitrumBridge,
        ),
        steps: [
          {
            estimatedExecutionTimeMs: isDeposit
              ? // 15 minutes for deposits, 7 days for withdrawals
                15 * 60 * 1000
              : 7 * 24 * 60 * 60 * 1000,
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
    }

    const bridger = new Erc20Bridger(l2Network)
    const erc20L1Address = fromAssetId((isDeposit ? sellAsset : buyAsset).assetId).assetReference

    if (sellAsset.assetId === usdcAssetId || sellAsset.assetId === usdcOnArbitrumAssetId) {
      // https://www.circle.com/en/cross-chain-transfer-protocol
      throw new Error('cctp not implemented')
    }

    if (isDeposit) {
      const estimatedParentChainGas = fetchTokenFallbackGasEstimates()
      const allowanceContract = await bridger.getL1GatewayAddress(erc20L1Address, l1Provider)

      const { fast } = await adapter.getGasFeeData()

      return Ok({
        id: uuid(),
        receiveAddress,
        affiliateBps,
        potentialAffiliateBps: '0',
        rate: '1',
        slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
          SwapperName.ArbitrumBridge,
        ),
        steps: [
          {
            // https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/components/TransactionHistory/TransactionsTableDetailsSteps.tsx#L42
            // 15 minutes in ms
            estimatedExecutionTimeMs: 15 * 60 * 1000,
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
          destinationAddress: receiveAddress ?? '',
        })
      : bridger.getWithdrawalRequest({
          amount: BigNumber.from(sellAmountIncludingProtocolFeesCryptoBaseUnit),
          // This isn't a typo - https://github.com/OffchainLabs/arbitrum-sdk/pull/474
          erc20l1Address: erc20L1Address,
          destinationAddress: receiveAddress ?? '',
          from: sendAddress ?? '',
        }))

    const buyAmountBeforeFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit
    const buyAmountAfterFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit

    const allowanceContract = (request as L1ToL2TransactionRequest).retryableData?.from || '0x0' // no allowance needed for ETH deposits

    const feeData = await getFees({
      adapter,
      data: request.txRequest.data.toString(),
      to: request.txRequest.to,
      value: request.txRequest.value.toString(),
      from: request.txRequest.from,
      supportsEIP1559,
    })

    const networkFeeCryptoBaseUnit = feeData.networkFeeCryptoBaseUnit
    return Ok({
      id: uuid(),
      receiveAddress,
      affiliateBps,
      potentialAffiliateBps: '0',
      rate,
      slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.ArbitrumBridge,
      ),
      steps: [
        {
          estimatedExecutionTimeMs: isDeposit
            ? // 15 minutes for deposits, 7 days for withdrawals
              15 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000,
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
