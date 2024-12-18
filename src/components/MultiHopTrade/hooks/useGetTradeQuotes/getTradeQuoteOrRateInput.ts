import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput, GetTradeRateInput, TradeRate } from '@shapeshiftoss/swapper'
import type { LifiTradeQuote } from '@shapeshiftoss/swapper/src/swappers/LifiSwapper/utils/types'
import type { Asset, CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { toBaseUnit } from 'lib/math'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetSolanaChainAdapter } from 'lib/utils/solana'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'

export type GetTradeQuoteOrRateInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  slippageTolerancePercentageDecimal?: string
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
  originalRate?: TradeRate
  lifiAllowedTools?: LifiTradeQuote['lifiTools'] | undefined
  // Potential affiliate bps - may be waved out either entirely or partially with FOX discounts
  potentialAffiliateBps: string
  // Actual affiliate bps - if the FOX discounts is off, this will be the same as *affiliateBps*
  // Otherwise, it will be the affiliate bps after the FOX discount is applied
  affiliateBps: string
  isSnapInstalled?: boolean
  pubKey?: string | undefined
  quoteOrRate: 'quote' | 'rate'
  receiveAddress: string | undefined
  sellAccountNumber: number | undefined
  wallet: HDWallet | undefined
}

export const getTradeQuoteOrRateInput = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  quoteOrRate,
  receiveAddress,
  sellAmountBeforeFeesCryptoPrecision,
  allowMultiHop,
  originalRate,
  affiliateBps,
  potentialAffiliateBps,
  slippageTolerancePercentageDecimal,
  pubKey,
}: GetTradeQuoteOrRateInputArgs): Promise<GetTradeQuoteInput | GetTradeRateInput> => {
  const tradeQuoteInputCommonArgs =
    quoteOrRate === 'quote' && receiveAddress && sellAccountNumber !== undefined
      ? {
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
          quoteOrRate: 'quote',
          originalRate,
        }
      : {
          sellAmountIncludingProtocolFeesCryptoBaseUnit: toBaseUnit(
            sellAmountBeforeFeesCryptoPrecision,
            sellAsset.precision,
          ),
          sellAsset,
          buyAsset,
          receiveAddress,
          originalRate,
          accountNumber: sellAccountNumber,
          affiliateBps: affiliateBps ?? '0',
          potentialAffiliateBps: potentialAffiliateBps ?? '0',
          allowMultiHop,
          slippageTolerancePercentageDecimal,
          quoteOrRate: 'rate',
        }

  const { chainNamespace } = fromChainId(sellAsset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const supportsEIP1559 = wallet && supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
      const sellAssetChainAdapter = assertGetEvmChainAdapter(sellAsset.chainId)
      const sendAddress =
        wallet && sellAccountNumber !== undefined
          ? await sellAssetChainAdapter.getAddress({
              accountNumber: sellAccountNumber,
              wallet,
              pubKey,
            })
          : undefined

      if (quoteOrRate === 'quote' && receiveAddress === undefined) {
        throw new Error('missing receiveAddress')
      }

      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as EvmChainId,
        supportsEIP1559: Boolean(supportsEIP1559),
        sendAddress,
      } as GetTradeQuoteInput
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

      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as CosmosSdkChainId,
        sendAddress,
      } as GetTradeQuoteInput
    }

    case CHAIN_NAMESPACE.Utxo: {
      // This is a UTXO quote without a sell account number handy - in effect, this means no wallet connected but could also happen if users do happen to
      // end up in a state where they still have a sell asset selected that their wallet doesn't support anymore
      // Either way, when there is no sellAccountNumber, meaning we can't get a pubKey out of it so we always return dummy BIP44 params
      if (quoteOrRate === 'rate' && sellAccountNumber === undefined)
        return {
          ...tradeQuoteInputCommonArgs,
          chainId: sellAsset.chainId as UtxoChainId,
          // Assumes a SegWit send, which works for all UTXOs - this may not be what users use for their actual swap when connecting a wallet,
          // but this ensures this works for all UTXOs
          accountType: UtxoAccountType.P2pkh,
          receiveAddress: undefined,
          accountNumber: undefined,
          xpub: undefined,
          quoteOrRate: 'rate',
        }

      if (!sellAccountType) throw Error('missing account type')
      if (sellAccountNumber === undefined) throw Error('missing account number')
      if (receiveAddress === undefined) throw Error('missing receive address')
      if (!wallet) throw Error('Wallet is required')

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

      // This is closer to a quote input than a rate input with those BIP44 params, but we do need the xpub here for fees estimation
      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as UtxoChainId,
        receiveAddress,
        accountNumber: sellAccountNumber,
        accountType: sellAccountType,
        xpub,
        sendAddress,
        quoteOrRate,
      } as GetTradeQuoteInput
    }
    case CHAIN_NAMESPACE.Solana: {
      const sellAssetChainAdapter = assertGetSolanaChainAdapter(sellAsset.chainId)

      const sendAddress =
        wallet && sellAccountNumber !== undefined
          ? await sellAssetChainAdapter.getAddress({
              accountNumber: sellAccountNumber,
              wallet,
              pubKey,
            })
          : undefined

      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as CosmosSdkChainId,
        sendAddress,
      } as GetTradeQuoteInput
    }
    default:
      assertUnreachable(chainNamespace)
  }
}
