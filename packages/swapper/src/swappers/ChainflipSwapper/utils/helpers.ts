import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { evm, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import {
  assertUnreachable,
  BigAmount,
  bn,
  bnOrZero,
  contractAddressOrUndefined,
  isToken,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type {
  CommonTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  SwapSource,
  TxBuildData,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import type { ChainflipSupportedChainId } from '../constants'
import {
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_QUOTE,
  CHAINFLIP_DCA_SWAP_SOURCE,
  CHAINFLIP_REGULAR_QUOTE,
  CHAINFLIP_SWAP_SOURCE,
  ChainflipSupportedAssetIdsByChainId,
  ChainflipSupportedChainIds,
  chainIdToChainflipNetwork,
  usdcAsset,
} from '../constants'
import type { ChainflipBaasQuoteQuote, ChainflipBaasSwapDepositAddress } from '../models'
import type { ChainflipNetwork } from '../types'
import { chainflipService } from './chainflipService'

const SAFE_GAS_LIMIT = '100000'

type ChainFlipBrokerBaseArgs = {
  brokerUrl: string
  apiKey: string
}

type GetChainFlipSwapArgs = ChainFlipBrokerBaseArgs & {
  sourceAsset: string
  destinationAsset: string
  destinationAddress: string
  maxBoostFee?: number
  minimumPrice: string
  refundAddress: string
  retryDurationInBlocks?: number
  commissionBps: number
  numberOfChunks?: number
  chunkIntervalBlocks?: number
}

type ChainflipAsset = {
  id: string
  ticker: string
  name: string
  network: ChainflipNetwork
  contractAddress?: string
}

export const isSupportedChainId = (chainId: ChainId): chainId is ChainflipSupportedChainId => {
  return ChainflipSupportedChainIds.includes(chainId as ChainflipSupportedChainId)
}

export const isSupportedAssetId = (
  chainId: ChainId,
  assetId: AssetId,
): chainId is ChainflipSupportedChainId => {
  const supportedAssetIds =
    ChainflipSupportedAssetIdsByChainId[chainId as ChainflipSupportedChainId]
  if (!supportedAssetIds) return false

  return supportedAssetIds.includes(assetId)
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<boolean, SwapErrorRight> => {
  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  if (!isSupportedAssetId(sellAsset.chainId, sellAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: sellAsset.chainId, assetId: sellAsset.assetId },
      }),
    )
  }

  if (!isSupportedAssetId(buyAsset.chainId, buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: buyAsset.chainId, assetId: buyAsset.assetId },
      }),
    )
  }

  return Ok(true)
}

export const calculateChainflipMinPrice = ({
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit,
  slippageTolerancePercentageDecimal,
  sellAsset,
  buyAsset,
}: {
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  slippageTolerancePercentageDecimal: string | undefined
  sellAsset: Asset
  buyAsset: Asset
}): string => {
  const sellAmountCryptoPrecision = BigAmount.fromBaseUnit({
    value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    precision: sellAsset.precision,
  }).toPrecision()

  const buyAmountCryptoPrecision = BigAmount.fromBaseUnit({
    value: buyAmountAfterFeesCryptoBaseUnit,
    precision: buyAsset.precision,
  }).toPrecision()

  const estimatedPrice = bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision)

  // This is called minimumPrice upstream but this really is a rate, let's not honour confusing terminology
  const minimumRate = estimatedPrice
    .times(bn(1).minus(bnOrZero(slippageTolerancePercentageDecimal)))
    .toFixed(buyAsset.precision)

  return minimumRate
}

export const getChainFlipSwap = ({
  brokerUrl,
  apiKey,
  sourceAsset,
  destinationAsset,
  destinationAddress,
  maxBoostFee = 0,
  minimumPrice,
  refundAddress,
  retryDurationInBlocks = 150,
  commissionBps,
  numberOfChunks,
  chunkIntervalBlocks = 2,
}: GetChainFlipSwapArgs): Promise<
  Result<AxiosResponse<ChainflipBaasSwapDepositAddress, any>, SwapErrorRight>
> => {
  let swapUrl =
    `${brokerUrl}/swap` +
    `?apiKey=${apiKey}` +
    `&sourceAsset=${sourceAsset}` +
    `&destinationAsset=${destinationAsset}` +
    `&destinationAddress=${destinationAddress}` +
    `&boostFee=${maxBoostFee}` +
    `&minimumPrice=${minimumPrice}` +
    `&refundAddress=${refundAddress}` +
    `&retryDurationInBlocks=${retryDurationInBlocks}` +
    `&commissionBps=${commissionBps}`

  if (numberOfChunks && chunkIntervalBlocks) {
    swapUrl += `&numberOfChunks=${numberOfChunks}`
    swapUrl += `&chunkIntervalBlocks=${chunkIntervalBlocks}`
  }

  // Opening a deposit channel can spike past the default 10s timeout (notably on Tron).
  return chainflipService.get<ChainflipBaasSwapDepositAddress>(swapUrl, { timeout: 30_000 })
}

const fetchChainFlipAssets = async ({
  brokerUrl,
}: Omit<ChainFlipBrokerBaseArgs, 'apiKey'>): Promise<Result<ChainflipAsset[], SwapErrorRight>> => {
  const result = await chainflipService.get<{ assets: ChainflipAsset[] }>(`${brokerUrl}/assets`)

  return result.map(({ data }) => data.assets)
}

export const getChainFlipIdFromAssetId = async ({
  assetId,
  brokerUrl,
}: Omit<ChainFlipBrokerBaseArgs, 'apiKey'> & { assetId: AssetId }): Promise<
  Result<string, SwapErrorRight>
> => {
  const maybeChainflipAssets = await fetchChainFlipAssets({
    brokerUrl,
  })
  const { assetReference, chainId } = fromAssetId(assetId)
  const _isToken = isToken(assetId)

  if (maybeChainflipAssets.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: `Error fetching Chainflip assets`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  const chainflipAssets = maybeChainflipAssets.unwrap()

  const chainflipAsset = chainflipAssets.find(asset => {
    const isCorrectNetwork = asset.network === chainIdToChainflipNetwork[chainId]
    if (!isCorrectNetwork) return false

    if (_isToken) {
      return asset.contractAddress?.toLowerCase() === assetReference.toLowerCase()
    }

    return !asset.contractAddress
  })

  if (!chainflipAsset)
    return Err(
      makeSwapErrorRight({
        message: `Asset not supported by Chainflip`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )

  return Ok(chainflipAsset.id)
}

export const getChainflipRate = ({
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
  sellAsset,
  buyAsset,
}: {
  sellAmountCryptoBaseUnit: string | null | undefined
  buyAmountCryptoBaseUnit: string | null | undefined
  sellAsset: Asset
  buyAsset: Asset
}): string => {
  if (!sellAmountCryptoBaseUnit || !buyAmountCryptoBaseUnit) return '0'

  return getInputOutputRate({
    sellAmountCryptoBaseUnit,
    buyAmountCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })
}

export const getSwapSource = (
  swapType: typeof CHAINFLIP_REGULAR_QUOTE | typeof CHAINFLIP_DCA_QUOTE,
  isBoosted: boolean,
): SwapSource => {
  if (swapType === CHAINFLIP_REGULAR_QUOTE) {
    return isBoosted ? CHAINFLIP_BOOST_SWAP_SOURCE : CHAINFLIP_SWAP_SOURCE
  }

  if (swapType === CHAINFLIP_DCA_QUOTE) {
    return isBoosted ? CHAINFLIP_DCA_BOOST_SWAP_SOURCE : CHAINFLIP_DCA_SWAP_SOURCE
  }

  return assertUnreachable(swapType)
}

export const getMaxBoostFee = (assetId: AssetId): number => {
  const { chainNamespace } = fromAssetId(assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Utxo:
      return 10
    case CHAIN_NAMESPACE.Evm:
    case CHAIN_NAMESPACE.Solana:
    case CHAIN_NAMESPACE.Tron:
      return 0
    default:
      throw new Error('Unsupported chainNamespace')
  }
}

export const getEvmTransactionData = ({
  sellAsset,
  depositAddress,
  sellAmountCryptoBaseUnit,
}: {
  sellAsset: Asset
  depositAddress: string
  sellAmountCryptoBaseUnit: string
}): TxBuildData | undefined => {
  if (!isEvmChainId(sellAsset.chainId)) return

  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
  const data = evm.getErc20Data(depositAddress, sellAmountCryptoBaseUnit, contractAddress)

  return {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: contractAddress ?? depositAddress,
    data: data || '0x',
    value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
  }
}

export const getProtocolFees = ({
  quote,
  sellAsset,
  buyAsset,
  sourceAsset,
  destinationAsset,
}: {
  quote: ChainflipBaasQuoteQuote
  sellAsset: Asset
  buyAsset: Asset
  sourceAsset: string
  destinationAsset: string
}): Record<AssetId, ProtocolFee> => {
  const protocolFees: Record<AssetId, ProtocolFee> = {}

  for (const fee of quote.includedFees ?? []) {
    if (fee.type === 'broker') continue

    const asset = (() => {
      if (fee.type === 'ingress' || fee.type === 'boost') return sellAsset
      if (fee.type === 'egress') return buyAsset
      if (fee.type === 'liquidity' && fee.asset === sourceAsset) return sellAsset
      if (fee.type === 'liquidity' && fee.asset === destinationAsset) return buyAsset
      if (fee.type === 'liquidity' && fee.asset === 'usdc.eth') return usdcAsset
      if (fee.type === 'network') return usdcAsset
    })()

    if (!asset) continue

    if (!(asset.assetId in protocolFees)) {
      protocolFees[asset.assetId] = {
        amountCryptoBaseUnit: '0',
        requiresBalance: false,
        asset,
      }
    }

    protocolFees[asset.assetId].amountCryptoBaseUnit = (
      BigInt(protocolFees[asset.assetId].amountCryptoBaseUnit) + BigInt(fee.amountNative ?? '0')
    ).toString()
  }

  return protocolFees
}

export const getStepFeeData = async ({
  deps,
  input,
  sellAsset,
  sellAmountCryptoBaseUnit,
  to,
  transactionData,
}: {
  deps: SwapperDeps
  input: GetTradeRateInput | CommonTradeQuoteInput
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  to: string | undefined
  transactionData: TxBuildData | undefined
}): Promise<{
  networkFeeCryptoBaseUnit: string | undefined
  chainSpecific?: { satsPerByte: string }
}> => {
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = (input as GetEvmTradeRateInput).supportsEIP1559

      if (transactionData?.type === 'evm' && input.sendAddress) {
        const { networkFeeCryptoBaseUnit } = await evm.getFees({
          adapter,
          data: transactionData.data,
          to: transactionData.to,
          value: transactionData.value,
          from: input.sendAddress,
          supportsEIP1559,
        })
        return { networkFeeCryptoBaseUnit }
      }

      const { average } = await adapter.getGasFeeData()

      const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
        ...average,
        supportsEIP1559,
        gasLimit: SAFE_GAS_LIMIT,
      })

      return { networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const pubkey = (input as GetUtxoTradeQuoteInput).xpub

      if (!pubkey) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        // Placeholder vault address for rates without a `to` — fee simulation requires one or it throws
        to: to ?? 'bc1pfh5x55a3v92klcrdy5yv6yrt7fzr0g929klkdtapp3njfyu4qsyq8qacyf',
        value: sellAmountCryptoBaseUnit,
        chainSpecific: { pubkey },
      })

      return {
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      if (!to || !input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    case CHAIN_NAMESPACE.Tron: {
      if (!to || !input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    default:
      throw new Error('Unsupported chainNamespace')
  }
}
