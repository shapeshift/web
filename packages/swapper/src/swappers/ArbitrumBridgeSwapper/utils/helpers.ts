import type {
  ChildToParentTransactionRequest,
  ParentToChildMessageReader,
  ParentToChildMessageReaderClassic,
  ParentToChildTransactionRequest,
} from '@arbitrum/sdk'
import {
  Erc20Bridger,
  EthBridger,
  getArbitrumNetwork,
  ParentTransactionReceipt,
} from '@arbitrum/sdk'
import {
  arbitrumAssetId,
  arbitrumChainId,
  ethAssetId,
  ethChainId,
  fromAssetId,
} from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type { ethers as ethersv5 } from 'ethers5'
import { BigNumber } from 'ethers5'
import { getAddress, isAddressEqual } from 'viem'
import { arbitrum } from 'viem/chains'

import type { SwapErrorRight, TradeQuote, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { BRIDGE_TYPE } from '../types'
import type { ArbitrumBridgeSupportedChainId } from './types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const isArbitrumBridgeWithdrawal = (quote: TradeQuote | TradeRate | undefined): boolean => {
  // withdrawal = selling from Arbitrum (deposit = selling from Ethereum to Arbitrum)
  return (
    quote?.swapperName === SwapperName.ArbitrumBridge &&
    quote.steps[0]?.sellAsset.chainId === arbitrumChainId
  )
}

export const getArbitrumBridgeType = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): BRIDGE_TYPE => {
  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit ? sellAsset.assetId === ethAssetId : buyAsset.assetId === ethAssetId

  if (isDeposit) return isEthBridge ? BRIDGE_TYPE.ETH_DEPOSIT : BRIDGE_TYPE.ERC20_DEPOSIT
  return isEthBridge ? BRIDGE_TYPE.ETH_WITHDRAWAL : BRIDGE_TYPE.ERC20_WITHDRAWAL
}

export const assertValidTrade = async ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Promise<Result<boolean, SwapErrorRight>> => {
  if (
    !arbitrumBridgeSupportedChainIds.includes(
      sellAsset.chainId as ArbitrumBridgeSupportedChainId,
    ) ||
    !arbitrumBridgeSupportedChainIds.includes(buyAsset.chainId as ArbitrumBridgeSupportedChainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (buyAsset.chainId === sellAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - both assets must be on different chainIds`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const isDeposit = sellAsset.chainId === ethChainId
  const isEthBridge = isDeposit
    ? sellAsset.assetId === ethAssetId
    : sellAsset.assetId === arbitrumAssetId
  const isTokenBridge = !isEthBridge

  if (isEthBridge) {
    const isInvalidPair = isDeposit
      ? buyAsset.assetId !== arbitrumAssetId
      : buyAsset.assetId !== ethAssetId

    if (isInvalidPair) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid ETH bridge pair`,
          code: TradeQuoteError.UnsupportedTradePair,
          details: { buyAsset, sellAsset },
        }),
      )
    }
  }
  if (isTokenBridge) {
    const childNetwork = await getArbitrumNetwork(arbitrum.id)
    const bridger = new Erc20Bridger(childNetwork)
    const erc20ParentAddress = fromAssetId(
      (isDeposit ? sellAsset : buyAsset).assetId,
    ).assetReference
    const erc20ChildAddress = fromAssetId((isDeposit ? buyAsset : sellAsset).assetId).assetReference
    const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
    const childProvider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

    // Since our related assets list isn't exhaustive and won't cut it to determine the Parent <-> Child mapping, we double check that the bridge is valid
    // by checking against Arbitrum bridge's own mappings, which uses different sources (Coingecko, Gemini, Uni and its own lists at the time of writing)
    // Tokens that aren't gateway-registered revert these lookups (e.g. native circle USDC has no
    // l1Address()) - the bridge can't move them, so a lookup failure is an unsupported pair
    const [arbitrumBridgeErc20ChildAddress, arbitrumBridgeErc20ParentAddress] = await Promise.all([
      bridger.getChildErc20Address(erc20ParentAddress, parentProvider),
      bridger.getParentErc20Address(erc20ChildAddress, childProvider),
    ]).catch(() => [undefined, undefined])

    if (!arbitrumBridgeErc20ChildAddress || !arbitrumBridgeErc20ParentAddress) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Token is not registered with the arbitrum bridge`,
          code: TradeQuoteError.UnsupportedTradePair,
          details: { buyAsset, sellAsset },
        }),
      )
    }

    if (
      !isAddressEqual(getAddress(arbitrumBridgeErc20ParentAddress), getAddress(erc20ParentAddress))
    ) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid Parent ERC20 address: ${erc20ParentAddress}`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
    if (
      !isAddressEqual(getAddress(arbitrumBridgeErc20ChildAddress), getAddress(erc20ChildAddress))
    ) {
      return Err(
        makeSwapErrorRight({
          message: `[ArbitrumBridge: tradeQuote] - Invalid Child ERC20 address: ${erc20ChildAddress}`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }
  }

  return Ok(true)
}

// ERC20 deposits approve the Parent gateway; everything else needs no approval
export const getArbitrumBridgeAllowanceContract = ({
  bridgeType,
  sellAsset,
}: {
  bridgeType: BRIDGE_TYPE
  sellAsset: Asset
}): Promise<string> => {
  if (bridgeType !== BRIDGE_TYPE.ERC20_DEPOSIT) return Promise.resolve('')

  const l2Network = getArbitrumNetwork(arbitrum.id)
  const bridger = new Erc20Bridger(l2Network)
  const erc20ParentAddress = fromAssetId(sellAsset.assetId).assetReference
  const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)

  return bridger.getParentGatewayAddress(erc20ParentAddress, parentProvider)
}

// Builds the executable bridge request via the Arbitrum SDK. The retryable estimation runs on the
// child node, so this builds before approval - only our own L1 fee estimation reverts pre-approval
export const buildArbitrumBridgeRequest = ({
  bridgeType,
  sellAmountCryptoBaseUnit,
  from,
  receiveAddress,
  sellAsset,
  buyAsset,
}: {
  bridgeType: BRIDGE_TYPE
  sellAmountCryptoBaseUnit: string
  from: string
  receiveAddress: string
  sellAsset: Asset
  buyAsset: Asset
}): Promise<
  | Omit<ParentToChildTransactionRequest | ChildToParentTransactionRequest, 'retryableData'>
  | undefined
> => {
  const l2Network = getArbitrumNetwork(arbitrum.id)
  const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const childProvider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)
  const amount = BigNumber.from(sellAmountCryptoBaseUnit)

  switch (bridgeType) {
    case BRIDGE_TYPE.ETH_DEPOSIT: {
      const bridger = new EthBridger(l2Network)
      return bridger
        .getDepositToRequest({
          parentProvider,
          childProvider,
          amount,
          from,
          destinationAddress: receiveAddress,
        })
        .catch(e => {
          console.error('Error getting ETH deposit request', e)
          return undefined
        })
    }
    case BRIDGE_TYPE.ETH_WITHDRAWAL: {
      const bridger = new EthBridger(l2Network)
      return bridger
        .getWithdrawalRequest({ amount, from, destinationAddress: receiveAddress })
        .catch(e => {
          console.error('Error getting ETH withdraw request', e)
          return undefined
        })
    }
    case BRIDGE_TYPE.ERC20_DEPOSIT: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20ParentAddress = fromAssetId(sellAsset.assetId).assetReference
      return bridger
        .getDepositRequest({
          amount,
          parentProvider,
          childProvider,
          erc20ParentAddress,
          from,
          destinationAddress: receiveAddress,
          retryableGasOverrides: {
            // https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/TokenDepositUtils.ts#L159
            // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
            // the 30% gas limit increase should cover the difference
            gasLimit: { percentIncrease: BigNumber.from(30) },
          },
        })
        .catch(e => {
          console.error('Error getting ERC20 deposit request', e)
          return undefined
        })
    }
    case BRIDGE_TYPE.ERC20_WITHDRAWAL: {
      const bridger = new Erc20Bridger(l2Network)
      const erc20ParentAddress = fromAssetId(buyAsset.assetId).assetReference
      return bridger
        .getWithdrawalRequest({
          amount,
          erc20ParentAddress,
          from,
          destinationAddress: receiveAddress,
        })
        .catch(e => {
          console.error('Error getting ERC20 withdraw request', e)
          return undefined
        })
    }
    default:
      return assertUnreachable(bridgeType)
  }
}

// https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/deposits/helpers.ts#L268
export const getParentToChildMessageDataFromParentTxHash = async ({
  depositTxId,
  parentProvider,
  childProvider,
  isClassic, // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  parentProvider: ethersv5.providers.JsonRpcProvider
  childProvider: ethersv5.providers.JsonRpcProvider
  isClassic?: boolean
}): Promise<
  | {
      isClassic?: boolean
      parentToChildMsg?: ParentToChildMessageReaderClassic | ParentToChildMessageReader
    }
  | undefined
> => {
  // fetch Parent transaction receipt
  const depositTxReceipt = await parentProvider.getTransactionReceipt(depositTxId)
  if (!depositTxReceipt) return

  const parentTxReceipt = new ParentTransactionReceipt(depositTxReceipt)

  // classic (pre-nitro) handling
  const getClassicDepositMessage = async () => {
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
    return {
      isClassic: true,
      parentToChildMsg,
    }
  }

  // post-nitro handling
  const getNitroDepositMessage = async () => {
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessages(childProvider)
    return {
      isClassic: false,
      parentToChildMsg,
    }
  }

  // if it is unknown whether the transaction isClassic or not, fetch the result
  const safeIsClassic = isClassic ?? (await parentTxReceipt.isClassic(childProvider))

  if (safeIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    return getClassicDepositMessage()
  }

  // post-nitro deposit - both eth + token
  return getNitroDepositMessage()
}
