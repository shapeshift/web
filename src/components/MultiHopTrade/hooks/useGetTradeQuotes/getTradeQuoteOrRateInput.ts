import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput, GetTradeRateInput } from '@shapeshiftoss/swapper'
import type {
  Asset,
  CosmosSdkChainId,
  EvmChainId,
  TronChainId,
  UtxoChainId,
} from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { toBaseUnit } from '@/lib/math'
import { assertUnreachable } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetSuiChainAdapter } from '@/lib/utils/sui'
import { assertGetTronChainAdapter } from '@/lib/utils/tron'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { store } from '@/state/store'

export type GetTradeQuoteOrRateInputArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAccountType: UtxoAccountType | undefined
  slippageTolerancePercentageDecimal?: string
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
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
  affiliateBps,
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
          affiliateBps,
          allowMultiHop,
          slippageTolerancePercentageDecimal,
          quoteOrRate: 'quote',
        }
      : {
          sellAmountIncludingProtocolFeesCryptoBaseUnit: toBaseUnit(
            sellAmountBeforeFeesCryptoPrecision,
            sellAsset.precision,
          ),
          sellAsset,
          buyAsset,
          receiveAddress,
          accountNumber: sellAccountNumber,
          affiliateBps,
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
    case CHAIN_NAMESPACE.Tron: {
      const sellAssetChainAdapter = assertGetTronChainAdapter(sellAsset.chainId)
      const walletType = selectWalletType(store.getState())
      const shouldSkipDeviceDerivation =
        !wallet &&
        (walletType === KeyManager.Ledger ||
          walletType === KeyManager.Trezor ||
          walletType === KeyManager.GridPlus)

      const sendAddress =
        (wallet || shouldSkipDeviceDerivation) && sellAccountNumber !== undefined
          ? await sellAssetChainAdapter.getAddress({
              accountNumber: sellAccountNumber,
              wallet: wallet ?? null,
              pubKey,
            })
          : undefined

      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as TronChainId,
        sendAddress,
      } as GetTradeQuoteInput
    }
    case CHAIN_NAMESPACE.Sui: {
      const sellAssetChainAdapter = assertGetSuiChainAdapter(sellAsset.chainId)

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
    case CHAIN_NAMESPACE.Near: {
      throw new Error('NEAR chain namespace not yet supported for trade quotes')
    }
    default:
      assertUnreachable(chainNamespace)
  }
}
