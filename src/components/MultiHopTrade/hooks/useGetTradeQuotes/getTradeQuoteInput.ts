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
  sellAccountNumber: number
  wallet: HDWallet
  receiveAddress: string
  slippageTolerancePercentageDecimal?: string
  receiveAccountNumber?: number
  sellAmountBeforeFeesCryptoPrecision: string
  allowMultiHop: boolean
  // Potential affiliate bps - may be waved out either entirely or partially with FOX discounts
  potentialAffiliateBps: string
  // Actual affiliate bps - if the FOX discounts is off, this will be the same as *affiliateBps*
  // Otherwise, it will be the affiliate bps after the FOX discount is applied
  affiliateBps: string
  isSnapInstalled?: boolean
  pubKey?: string | undefined
}

export const getTradeQuoteInput = async ({
  sellAsset,
  buyAsset,
  sellAccountNumber,
  sellAccountType,
  wallet,
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
      const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())
      const sellAssetChainAdapter = assertGetEvmChainAdapter(sellAsset.chainId)
      const sendAddress = await sellAssetChainAdapter.getAddress({
        accountNumber: sellAccountNumber,
        wallet,
        pubKey,
      })
      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as EvmChainId,
        supportsEIP1559,
        sendAddress,
        receiveAccountNumber,
      }
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      const sellAssetChainAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)
      const sendAddress = await sellAssetChainAdapter.getAddress({
        accountNumber: sellAccountNumber,
        wallet,
        pubKey,
      })
      return {
        ...tradeQuoteInputCommonArgs,
        chainId: sellAsset.chainId as CosmosSdkChainId,
        sendAddress,
        receiveAccountNumber,
      }
    }

    case CHAIN_NAMESPACE.Utxo: {
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
    default:
      assertUnreachable(chainNamespace)
  }
}
