import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { Asset, CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
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
      hasWallet: true
    }
  | {
      receiveAccountNumber?: number
      receiveAddress: string | undefined
      sellAccountNumber: number | undefined
      wallet: HDWallet | undefined
      hasWallet: false
    }
)

export const getTradeQuoteInput = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  hasWallet,
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
      const supportsEIP1559 =
        hasWallet && supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
      const sellAssetChainAdapter = assertGetEvmChainAdapter(sellAsset.chainId)
      const sendAddress =
        wallet && sellAccountNumber !== undefined
          ? await sellAssetChainAdapter.getAddress({
              accountNumber: sellAccountNumber,
              wallet,
              pubKey,
            })
          : undefined

      if (wallet && receiveAccountNumber === undefined)
        throw new Error('missing receiveAccountNumber')

      return hasWallet && receiveAccountNumber !== undefined
        ? {
            ...tradeQuoteInputCommonArgs,
            chainId: sellAsset.chainId as EvmChainId,
            hasWallet,
            supportsEIP1559: supportsEIP1559!,
            receiveAddress,
            accountNumber: sellAccountNumber,
            ...(sendAddress ? { sendAddress } : {}),
            receiveAccountNumber,
          }
        : {
            ...tradeQuoteInputCommonArgs,
            chainId: sellAsset.chainId as EvmChainId,
            hasWallet: false,
            supportsEIP1559: undefined,
            receiveAddress: undefined,
            accountNumber: undefined,
            sendAddress: undefined,
            receiveAccountNumber: undefined,
          }
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      const sellAssetChainAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)
      const sendAddress =
        wallet && sellAccountNumber !== undefined
          ? await sellAssetChainAdapter.getAddress({
              accountNumber: sellAccountNumber,
              wallet,
              pubKey,
            })
          : undefined
      return hasWallet
        ? {
            ...tradeQuoteInputCommonArgs,
            hasWallet,
            receiveAddress,
            accountNumber: sellAccountNumber,
            chainId: sellAsset.chainId as CosmosSdkChainId,
            ...(sendAddress ? { sendAddress } : {}),
            receiveAccountNumber,
          }
        : {
            ...tradeQuoteInputCommonArgs,
            hasWallet,
            receiveAddress: undefined,
            accountNumber: undefined,
            chainId: sellAsset.chainId as CosmosSdkChainId,
            sendAddress: undefined,
            receiveAccountNumber: undefined,
          }
    }

    case CHAIN_NAMESPACE.Utxo: {
      if (!hasWallet)
        return {
          ...tradeQuoteInputCommonArgs,
          chainId: sellAsset.chainId as UtxoChainId,
          // Assumes a SegWit send, which works for all UTXOs - this may not be what users use for their actual swap when connecting a wallet,
          // but this ensures this works for all UTXOs
          accountType: UtxoAccountType.P2pkh,
          receiveAddress: undefined,
          accountNumber: undefined,
          xpub: undefined,
          hasWallet: false,
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
        hasWallet,
        receiveAddress,
        accountNumber: sellAccountNumber,
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
