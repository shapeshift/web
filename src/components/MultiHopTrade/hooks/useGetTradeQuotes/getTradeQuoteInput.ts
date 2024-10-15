import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type {
  Asset,
  CosmosSdkChainId,
  EvmChainId,
  UtxoAccountType,
  UtxoChainId,
} from '@shapeshiftoss/types'
import type { TradeQuoteInputCommonArgs } from 'components/MultiHopTrade/types'
import { toBaseUnit } from 'lib/math'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'

export type GetTradeQuoteInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  slippageTolerancePercentageDecimal?: string
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
  // Potential affiliate bps - may be waved out either entirely or partially with FOX discounts
  potentialAffiliateBps: string
  // Actual affiliate bps - if the FOX discounts is off, this will be the same as *affiliateBps*
  // Otherwise, it will be the affiliate bps after the FOX discount is applied
  affiliateBps: string
  isSnapInstalled?: boolean
  pubKey?: string | undefined
} & (
  | {
      receiveAccountNumber?: number
      receiveAddress: string
      sellAccountNumber: number
      wallet: HDWallet
      isConnected: true
    }
  | {
      receiveAccountNumber?: number
      receiveAddress: undefined
      sellAccountNumber: undefined
      wallet: undefined
      isConnected: false
    }
)

export const getTradeQuoteInput = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  isConnected,
  receiveAddress,
  receiveAccountNumber,
  sellAmountBeforeFeesCryptoPrecision,
  allowMultiHop,
  affiliateBps,
  potentialAffiliateBps,
  slippageTolerancePercentageDecimal,
  pubKey,
}: GetTradeQuoteInputArgs): Promise<GetTradeQuoteInput> => {
  const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
    sellAmountIncludingProtocolFeesCryptoBaseUnit: toBaseUnit(
      sellAmountBeforeFeesCryptoPrecision,
      sellAsset.precision,
    ),
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber: sellAccountNumber,
    affiliateBps: affiliateBps ?? '0',
    potentialAffiliateBps: potentialAffiliateBps ?? '0',
    allowMultiHop,
    slippageTolerancePercentageDecimal,
  }

  const { chainNamespace } = fromChainId(sellAsset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const supportsEIP1559 = wallet && supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
      const sellAssetChainAdapter = assertGetEvmChainAdapter(sellAsset.chainId)
      const sendAddress = wallet
        ? await sellAssetChainAdapter.getAddress({
            accountNumber: sellAccountNumber,
            wallet,
            pubKey,
          })
        : undefined
      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as EvmChainId,
        isConnected,
        supportsEIP1559,
        sendAddress,
        receiveAccountNumber,
      }
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      const sellAssetChainAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)
      const sendAddress = wallet
        ? await sellAssetChainAdapter.getAddress({
            accountNumber: sellAccountNumber,
            wallet,
            pubKey,
          })
        : undefined
      return {
        ...tradeQuoteInputCommonArgs,
        isConnected,
        chainId: sellAsset.chainId as CosmosSdkChainId,
        sendAddress,
        receiveAccountNumber,
      }
    }

    case CHAIN_NAMESPACE.Utxo: {
      if (!wallet || !isConnected)
        return {
          ...tradeQuoteInputCommonArgs,
          chainId: sellAsset.chainId as UtxoChainId,
          accountType: sellAccountType,
        }

      if (!sellAccountType) {
        throw Error('missing account type')
      }
      const sellAssetChainAdapter = assertGetUtxoChainAdapter(sellAsset.chainId)
      const sendAddress = await sellAssetChainAdapter.getAddress({
        accountNumber: sellAccountNumber,
        wallet,
        accountType: sellAccountType,
        pubKey,
      })

      const xpub =
        pubKey ??
        (await sellAssetChainAdapter.getPublicKey(wallet, sellAccountNumber, sellAccountType)).xpub
      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as UtxoChainId,
        accountType: sellAccountType,
        xpub,
        sendAddress,
      }
    }
    case CHAIN_NAMESPACE.Solana: {
      throw new Error('Solana is not supported in getTradeQuoteInput')
    }
    default:
      assertUnreachable(chainNamespace)
  }
}
