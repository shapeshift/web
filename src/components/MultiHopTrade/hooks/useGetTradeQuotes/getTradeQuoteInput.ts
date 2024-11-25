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
import { assertGetSolanaChainAdapter } from 'lib/utils/solana'
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
  quoteOrRate: 'quote' | 'rate'
  receiveAddress: string | undefined
  sellAccountNumber: number | undefined
  wallet: HDWallet | undefined
}

export const getTradeQuoteInput = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
  quoteOrRate,
  receiveAddress,
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
    quoteOrRate,
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
      // This is a quote without a wallet, we monkey-patch things to the best of our ability
      if (quoteOrRate === 'rate' && !receiveAddress)
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
      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as UtxoChainId,
        receiveAddress,
        accountNumber: sellAccountNumber,
        accountType: sellAccountType,
        xpub,
        sendAddress,
        quoteOrRate,
      }
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
