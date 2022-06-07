import { adapters, AssetId, fromAssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero } from '../../../utils/bignumber'
import { InboundResponse, ThorchainSwapperDeps } from '../../types'
import { thorService } from '../thorService'

const gweiGasPrecision = 9

// https://docs.thorchain.org/how-it-works/fees#outbound-fee
// estimatedTradeFee = `3 * estimatedFeeOutboundFee`

// eth txs from thorchain use approx 38383 gas
const ethEstimate = (gasRate: string) =>
  bnOrZero(gasRate).times(38383).times(3).times(bn(10).exponentiatedBy(gweiGasPrecision)).toString()

// erc20 txs from thorchain use approx 70996 gas
const erc20Estimate = (gasRate: string) =>
  bnOrZero(gasRate).times(70996).times(3).times(bn(10).exponentiatedBy(gweiGasPrecision)).toString()

// BTC utxo transactions from thorchain are approx 303 bytes long
const btcEstimate = (gasRate: string) => bnOrZero(gasRate).times(303).times(3).toString()

export const estimateTradeFee = async (
  deps: ThorchainSwapperDeps,
  buyAssetId: AssetId
): Promise<string> => {
  const thorId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  if (!thorId)
    throw new SwapError('[estimateTradeFee] - undefined thorId for given buyAssetId', {
      code: SwapErrorTypes.VALIDATION_FAILED,
      details: { buyAssetId }
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
  const { chainId, assetNamespace } = fromAssetId(buyAssetId)

  switch (chainId) {
    case 'bip122:000000000019d6689c085ae165831e93':
      return btcEstimate(gasRate)
    case 'eip155:1':
      switch (assetNamespace) {
        case 'slip44':
          return ethEstimate(gasRate)
        case 'erc20':
          return erc20Estimate(gasRate)
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
