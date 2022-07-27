import { Asset } from '@shapeshiftoss/asset-service'
import { adapters, fromAssetId, getFeeAssetIdFromAssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero, fromBaseUnit } from '../../../utils/bignumber'
import { InboundResponse, ThorchainSwapperDeps } from '../../types'
import { THOR_TRADE_FEE_BTC_SIZE, THOR_TRADE_FEE_ETH_GAS } from '../constants'
import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { thorService } from '../thorService'

const gweiGasPrecision = 9

// Official docs on fees are incorrect
// https://discord.com/channels/838986635756044328/997675038675316776/998552541170253834
// This is still not "perfect" and tends to overestimate by a randomish amount
// TODO figure out if its possible to accurately estimate the outbound fee.
// Neither the discord nor official docs are correct

const ethEstimate = (gasRate: string) =>
  bnOrZero(gasRate)
    .times(THOR_TRADE_FEE_ETH_GAS)
    .times(2)
    .times(bn(10).exponentiatedBy(gweiGasPrecision))
    .toString()

const erc20Estimate = (gasRate: string) =>
  bnOrZero(gasRate)
    .times(THOR_TRADE_FEE_ETH_GAS)
    .times(2)
    .times(bn(10).exponentiatedBy(gweiGasPrecision))
    .toString()

const btcEstimate = (gasRate: string) =>
  bnOrZero(gasRate).times(THOR_TRADE_FEE_BTC_SIZE).times(2).toString()

export const estimateTradeFee = async (
  deps: ThorchainSwapperDeps,
  buyAsset: Asset
): Promise<string> => {
  const thorId = adapters.assetIdToPoolAssetId({ assetId: buyAsset.assetId })
  if (!thorId)
    throw new SwapError('[estimateTradeFee] - undefined thorId for given buyAssetId', {
      code: SwapErrorTypes.VALIDATION_FAILED,
      details: { buyAssetId: buyAsset.assetId }
    })

  const thorPoolChainId = thorId.slice(0, thorId.indexOf('.'))

  const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
    `${deps.midgardUrl}/thorchain/inbound_addresses`
  )

  const inboundInfo = inboundAddresses.find((inbound) => inbound.chain === thorPoolChainId)

  if (!inboundInfo)
    throw new SwapError('[estimateTradeFee] - unable to locate inbound pool info', {
      code: SwapErrorTypes.VALIDATION_FAILED,
      details: { thorPoolChainId }
    })

  const gasRate = inboundInfo.gas_rate
  const { chainId, assetNamespace } = fromAssetId(buyAsset.assetId)

  const feeAssetId = getFeeAssetIdFromAssetId(buyAsset.assetId)
  if (!feeAssetId)
    throw new SwapError('[estimateTradeFee] - no fee assetId', {
      code: SwapErrorTypes.VALIDATION_FAILED,
      details: { buyAssetId: buyAsset.assetId }
    })

  const feeAssetRatio =
    buyAsset.assetId !== feeAssetId
      ? await getPriceRatio(deps, {
          sellAssetId: buyAsset.assetId,
          buyAssetId: feeAssetId
        })
      : '1'

  switch (chainId) {
    case 'bip122:000000000019d6689c085ae165831e93':
      return fromBaseUnit(
        bnOrZero(btcEstimate(gasRate)).times(feeAssetRatio).dp(0),
        buyAsset.precision
      )
    case 'eip155:1':
      switch (assetNamespace) {
        case 'slip44':
          return fromBaseUnit(
            bnOrZero(ethEstimate(gasRate)).times(feeAssetRatio).dp(0),
            buyAsset.precision
          )
        case 'erc20':
          return fromBaseUnit(
            bnOrZero(erc20Estimate(gasRate)).times(feeAssetRatio).dp(0),
            buyAsset.precision
          )
        default:
          throw new SwapError('[estimateTradeFee] - unsupported asset namespace', {
            code: SwapErrorTypes.VALIDATION_FAILED,
            details: { assetNamespace }
          })
      }
    default:
      throw new SwapError('[estimateTradeFee] - unsupported chain id', {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { chainId }
      })
  }
}
