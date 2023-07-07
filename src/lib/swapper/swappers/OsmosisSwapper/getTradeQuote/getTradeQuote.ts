import type { ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput, osmosis } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import {
  getMinimumCryptoHuman,
  getRateInfo,
} from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import type { OsmosisSupportedChainId } from 'lib/swapper/swappers/OsmosisSwapper/utils/types'

import { DEFAULT_SOURCE } from '../utils/constants'

export const getTradeQuote = async (
  input: GetTradeQuoteInput,
  { sellAssetUsdRate }: { sellAssetUsdRate: string },
): Promise<Result<TradeQuote<ChainId>, SwapErrorRight>> => {
  const {
    accountNumber,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
  } = input
  if (!sellAmountCryptoBaseUnit) {
    return Err(
      makeSwapErrorRight({
        message: 'sellAmount is required',
        code: SwapErrorType.RESPONSE_ERROR,
      }),
    )
  }

  const adapterManager = getChainAdapterManager()

  const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl } = getConfig()

  const maybeRateInfo = await getRateInfo(
    sellAsset.symbol,
    buyAsset.symbol,
    sellAmountCryptoBaseUnit !== '0' ? sellAmountCryptoBaseUnit : '1',
    osmoUrl,
  )

  if (maybeRateInfo.isErr()) return Err(maybeRateInfo.unwrapErr())
  const { buyAssetTradeFeeCryptoBaseUnit, rate, buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

  const minimumCryptoHuman = getMinimumCryptoHuman(sellAssetUsdRate)

  const osmosisAdapter = adapterManager.get(osmosisChainId) as osmosis.ChainAdapter | undefined
  const cosmosAdapter = adapterManager.get(cosmosChainId) as cosmos.ChainAdapter | undefined

  // TODO(gomes): assertion util
  if (!osmosisAdapter || !cosmosAdapter)
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get Cosmos SDK adapters',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )

  const buyAssetIsOnOsmosisNetwork = buyAsset.chainId === osmosisChainId
  const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId

  // Fees

  // First hop fees are always paid in the native asset of the sell chain
  // i.e ATOM for ATOM -> OSMO, OSMO for OSMO -> ATOM
  const firstHopAdapter = sellAssetIsOnOsmosisNetwork ? osmosisAdapter : cosmosAdapter
  const getFirstHopFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const firstHopFeeData = await firstHopAdapter.getFeeData(getFirstHopFeeDataInput)
  const firstHopFee = firstHopFeeData.fast.txFee
  // Second hop always happens on Osmosis, so the fee is always paid in OSMO. i.e:
  // 1. in OSMO for OSMO -> ATOM, since both the swap-exact-amount-in to ATOM on Osmosis, and the IBC transfer to Cosmos IBC channel are paid in OSMO
  // 2. in OSMO for ATOM -> OSMO, since the IBC transfer is paid in ATOM, but the second IBC transfer hop is paid in OSMO
  const secondHopAdapter = osmosisAdapter
  const getSecondHopFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const secondHopFeeData = await secondHopAdapter.getFeeData(getSecondHopFeeDataInput)
  const secondHopFee = secondHopFeeData.fast.txFee

  // First hop buy asset is always ATOM on Osmosis i.e
  // - for ATOM -> OSMO trades, we IBC transfer ATOM to ATOM on Osmosis so we can then swap it for OSMO
  // - for OSMO -> ATOM trades, we swap OSMO for ATOM on Osmosis so we can then IBC transfer it

  // Hardcoded to keep things simple, we may want to make an exchange request instead
  // https://shapeshift.readme.io/reference/assets-search
  const atomOnOsmosisAsset: Asset = {
    assetId:
      'cosmos:osmosis-1/ibc:27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    chainId: 'cosmos:osmosis-1',
    symbol: 'ATOM',
    name: 'Cosmos Hub Atom on Osmosis',
    precision: 6,
    color: '#272D45',
    icon: 'https://rawcdn.githack.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
    explorer: 'https://www.mintscan.io/osmosis',
    explorerAddressLink: 'https://www.mintscan.io/osmosis/account/',
    explorerTxLink: 'https://www.mintscan.io/osmosis/txs/',
  }

  const firstHopBuyAsset = atomOnOsmosisAsset

  // TODO(gomes): this is incorrect, and reflects assuming the whole swap as a single hop
  // It needs to be programmatic on the OSMO -> ATOM or ATOM -> OSMO direction
  const firstStep: TradeQuoteStep<OsmosisSupportedChainId> = {
    allowanceContract: '',
    buyAsset: firstHopBuyAsset,
    feeData: {
      networkFeeCryptoBaseUnit: firstHopFee,
      protocolFees: {
        // TODO: OSMO -> ATOM should have protocol fees on the first hop since this is an actual swap
        // However, ATOM -> OSMO shouldn't have protocol fees on the first hop since this is just an IBC transfer i.e network fees apply, not protocol fees
        // [buyAsset.assetId]: {
        // amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
        // requiresBalance: true,
        // asset: buyAsset,
        // },
      },
    },
    accountNumber,
    rate,
    sellAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit: sellAssetIsOnOsmosisNetwork
      ? buyAmountCryptoBaseUnit
      : sellAmountCryptoBaseUnit,
    sources: DEFAULT_SOURCE,
  }

  return Ok({
    minimumCryptoHuman,
    steps: [firstStep],
  })
}
