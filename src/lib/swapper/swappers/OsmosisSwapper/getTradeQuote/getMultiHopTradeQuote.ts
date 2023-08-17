import { osmosisChainId } from '@shapeshiftoss/caip'
import type { cosmos, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { osmosis } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
} from 'lib/swapper/api'
import { getRateInfo } from 'lib/swapper/swappers/OsmosisSwapper/utils/helpers'
import type { OsmosisSupportedChainId } from 'lib/swapper/swappers/OsmosisSwapper/utils/types'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'

import { DEFAULT_SOURCE } from '../utils/constants'

export const getTradeQuote = async (
  input: GetTradeQuoteInput,
): Promise<Result<TradeQuote, SwapErrorRight>> => {
  const {
    // TODO(gomes): very very dangerous. We currently use account number both on the sending and receiving side and this will break cross-account.
    accountNumber,
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input
  const { REACT_APP_OSMOSIS_NODE_URL: osmoUrl } = getConfig()

  const maybeRateInfo = await getRateInfo(
    sellAsset.symbol,
    buyAsset.symbol,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    osmoUrl,
  )

  if (maybeRateInfo.isErr()) return Err(maybeRateInfo.unwrapErr())
  const { buyAssetTradeFeeCryptoBaseUnit, rate, buyAmountCryptoBaseUnit } = maybeRateInfo.unwrap()

  const buyAssetIsOnOsmosisNetwork = buyAsset.chainId === osmosisChainId
  const sellAssetIsOnOsmosisNetwork = sellAsset.chainId === osmosisChainId

  // Network fees

  const osmosisAdapter = assertGetCosmosSdkChainAdapter(osmosisChainId) as osmosis.ChainAdapter
  // First hop network fees are always paid in the native asset of the sell chain
  // i.e ATOM for ATOM -> OSMO IBC transfer, OSMO for OSMO -> ATOM swap-exact-amount-in
  const firstHopAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId) as
    | cosmos.ChainAdapter
    | osmosis.ChainAdapter
  const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = {}
  const firstHopFeeData = await firstHopAdapter.getFeeData(getFeeDataInput)
  const firstHopNetworkFee = firstHopFeeData.fast.txFee
  // Second hop *always* happens on Osmosis, but the fee isn't necessarily paid in OSMO
  // 1. for OSMO -> ATOM, the IBC transfer fee is paid in OSMO
  // 2. for ATOM -> OSMO, the swap-exact-amount-in fee is paid in ATOM in OSMO, *not* in OSMO
  const secondHopAdapter = osmosisAdapter
  const osmosisFeeData = await secondHopAdapter.getFeeData(getFeeDataInput)
  // ATOM -> OSMO swap-exact-amount-in doesn't fit our regular network fee model in that fees aren't paid in the chain's native asset
  // So we can't represent them as network fees, but rather need to represent them as protocol fees
  // Hence we zero out the network fees, which is semantically incorrect but the best we can do for now
  const secondHopNetworkFee = buyAssetIsOnOsmosisNetwork ? '0' : osmosis.MIN_FEE

  // Protocol fees

  const osmosisToCosmosProtocolFees = [
    {
      [buyAsset.assetId]: {
        amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
        requiresBalance: false,
        asset: buyAsset,
      },
    },
    {}, // No need to represent the second hop's network fee as a protocol fee since it's the hop chain's native asset
  ]

  const cosmosToOsmosisProtocolFees = [
    // Representing both as second hop fees, i.e both of these are effectively in the second hop:
    // - the ATOM being used for network fees when doing a swap-exact-amount-in
    // - the OSMO being deducted as pool fees when doing the same swap-exact-amount-in
    {},
    {
      [buyAsset.assetId]: {
        amountCryptoBaseUnit: buyAssetTradeFeeCryptoBaseUnit,
        requiresBalance: false,
        asset: buyAsset,
      },
      [sellAsset.assetId]: {
        amountCryptoBaseUnit: osmosisFeeData.fast.txFee,
        requiresBalance: false, // network fee for second hop, represented as a protocol fee here
        asset: sellAsset,
      },
    },
  ]

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

  // First hop buy asset is always ATOM on Osmosis i.e
  // - for ATOM -> OSMO trades, we IBC transfer ATOM to ATOM on Osmosis so we can then swap it for OSMO
  // - for OSMO -> ATOM trades, we swap OSMO for ATOM on Osmosis so we can then IBC transfer it
  const firstHopBuyAsset = atomOnOsmosisAsset
  // Regardless of whether or not we're on the ATOM -> OSMO or OSMO -> ATOM direction, the second swap is the one we actually get the buy asset
  const secondHopBuyAsset = buyAsset

  const firstStep: TradeQuoteStep<OsmosisSupportedChainId> = {
    allowanceContract: '',
    buyAsset: firstHopBuyAsset,
    feeData: {
      networkFeeCryptoBaseUnit: firstHopNetworkFee,
      protocolFees: sellAssetIsOnOsmosisNetwork
        ? osmosisToCosmosProtocolFees[0]
        : cosmosToOsmosisProtocolFees[0],
    },
    accountNumber,
    rate,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit: sellAssetIsOnOsmosisNetwork
      ? buyAmountCryptoBaseUnit // OSMO -> ATOM, the ATOM on OSMO before fees is the same as the ATOM buy amount intent
      : sellAmountIncludingProtocolFeesCryptoBaseUnit, // ATOM -> ATOM, the ATOM on OSMO before fees is the same as the sold ATOM amount
    sources: DEFAULT_SOURCE,
  }

  const secondStep: TradeQuoteStep<OsmosisSupportedChainId> = {
    allowanceContract: '',
    buyAsset: secondHopBuyAsset,
    feeData: {
      networkFeeCryptoBaseUnit: secondHopNetworkFee,
      protocolFees: sellAssetIsOnOsmosisNetwork
        ? osmosisToCosmosProtocolFees[1]
        : cosmosToOsmosisProtocolFees[1],
    },
    accountNumber,
    rate,
    sellAsset: atomOnOsmosisAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAssetIsOnOsmosisNetwork
      ? bnOrZero(firstStep.buyAmountBeforeFeesCryptoBaseUnit)
          .minus(firstHopFeeData.slow.txFee)
          .toString()
      : bnOrZero(firstStep.buyAmountBeforeFeesCryptoBaseUnit)
          .minus(firstHopFeeData.fast.txFee)
          .toString(),
    buyAmountBeforeFeesCryptoBaseUnit: bnOrZero(buyAmountCryptoBaseUnit).toString(),
    sources: DEFAULT_SOURCE,
  }

  return Ok({
    rate,
    steps: [firstStep, secondStep],
  })
}
