import { bchAssetId, CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { BTCSignTx, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  isExecutableTradeQuote,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import { skipToken, useQuery } from '@tanstack/react-query'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { TradeExecution } from 'lib/tradeExecution'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetSolanaChainAdapter } from 'lib/utils/solana'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectConfirmedTradeExecution,
  selectHopSellAccountId,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useTradeNetworkFeeCryptoBaseUnit = ({
  hopIndex,
  enabled = true,
}: {
  hopIndex: SupportedTradeQuoteStepIndex
  enabled?: boolean
}) => {
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)

  const hopSellAccountIdFilter = useMemo(() => {
    return {
      hopIndex,
    }
  }, [hopIndex])

  const confirmedTradeExecution = useAppSelector(selectConfirmedTradeExecution)
  console.log({ confirmedTradeExecution })
  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const accountMetadataFilter = useMemo(
    () => ({ accountId: sellAssetAccountId }),
    [sellAssetAccountId],
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )
  const swapperName = useAppSelector(selectActiveSwapperName)
  const tradeQuote = useAppSelector(selectActiveQuote)

  const hop = useMemo(() => getHopByIndex(tradeQuote, hopIndex), [tradeQuote, hopIndex])
  const swapper = useMemo(() => (swapperName ? swappers[swapperName] : undefined), [swapperName])

  const quoteNetworkFeesCryptoBaseUnitQuery = useQuery({
    queryKey: ['quoteNetworkFeesCryptoBaseUnit', tradeQuote],
    refetchInterval: 5000,
    queryFn:
      enabled &&
      wallet &&
      accountMetadata &&
      tradeQuote &&
      swapperName &&
      sellAssetAccountId &&
      swapper &&
      hop &&
      isExecutableTradeQuote(tradeQuote)
        ? async () => {
            const execution = new TradeExecution()

            const { accountType, bip44Params } = accountMetadata
            const accountNumber = bip44Params.accountNumber
            const stepSellAssetChainId = hop.sellAsset.chainId
            const stepSellAssetAssetId = hop.sellAsset.assetId
            const stepBuyAssetAssetId = hop.buyAsset.assetId

            if (swapperName === SwapperName.CowSwap) {
              // No network fees for CowSwap as this is a message signing
              return '0'
            }

            const { chainNamespace: stepSellAssetChainNamespace } =
              fromChainId(stepSellAssetChainId)

            const receiverAddress =
              stepBuyAssetAssetId === bchAssetId
                ? tradeQuote.receiveAddress.replace('bitcoincash:', '')
                : tradeQuote.receiveAddress

            switch (stepSellAssetChainNamespace) {
              case CHAIN_NAMESPACE.Evm: {
                if (!swapper.getEvmTransactionFees) throw Error('missing getEvmTransactionFees')
                const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
                const from = await adapter.getAddress({ accountNumber, wallet })
                const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

                const output = await swapper.getEvmTransactionFees({
                  chainId: hop.sellAsset.chainId,
                  tradeQuote,
                  stepIndex: hopIndex,
                  slippageTolerancePercentageDecimal,
                  // permit2Signature is zrx-specific and always on the first hop
                  permit2Signature: confirmedTradeExecution?.firstHop.permit2?.permit2Signature,
                  from,
                  supportsEIP1559,
                  config: getConfig(),
                  assertGetEvmChainAdapter,
                })
                return output
              }
              case CHAIN_NAMESPACE.Utxo: {
                if (accountType === undefined) throw Error('Missing UTXO account type')

                const adapter = assertGetUtxoChainAdapter(stepSellAssetChainId)
                const { xpub } = await adapter.getPublicKey(wallet, accountNumber, accountType)
                const _senderAddress = await adapter.getAddress({
                  accountNumber,
                  accountType,
                  wallet,
                })
                const senderAddress =
                  stepSellAssetAssetId === bchAssetId
                    ? _senderAddress.replace('bitcoincash:', '')
                    : _senderAddress

                const output = await execution.execUtxoTransaction({
                  swapperName,
                  tradeQuote,
                  stepIndex: hopIndex,
                  slippageTolerancePercentageDecimal,
                  xpub,
                  senderAddress: _senderAddress,
                  accountType,
                  signAndBroadcastTransaction: async (txToSign: BTCSignTx) => {
                    const signedTx = await adapter.signTransaction({
                      txToSign,
                      wallet,
                    })

                    const output = await adapter.broadcastTransaction({
                      senderAddress,
                      receiverAddress,
                      hex: signedTx,
                    })

                    return output
                  },
                })
                return
              }
              case CHAIN_NAMESPACE.CosmosSdk: {
                if (!swapper.getCosmosSdkTransactionFees)
                  throw Error('missing getCosmosSdkTransactionFees')

                const adapter = assertGetCosmosSdkChainAdapter(stepSellAssetChainId)
                const from = await adapter.getAddress({ accountNumber, wallet })

                const output = await swapper.getCosmosSdkTransactionFees({
                  tradeQuote,
                  chainId: hop.sellAsset.chainId,
                  from,
                  assertGetCosmosSdkChainAdapter,
                  config: getConfig(),
                })
                return output
              }
              case CHAIN_NAMESPACE.Solana: {
                if (!swapper.getSolanaTransactionFees)
                  throw Error('missing getSolanaTransactionFees')

                const adapter = assertGetSolanaChainAdapter(stepSellAssetChainId)
                const from = await adapter.getAddress({ accountNumber, wallet })

                const output = await swapper.getSolanaTransactionFees(
                  {
                    tradeQuote,
                    from,
                    stepIndex: hopIndex,
                    slippageTolerancePercentageDecimal,
                    chainId: hop.sellAsset.chainId,
                    config: getConfig(),
                  },
                  { assertGetSolanaChainAdapter },
                )
                return output
              }
              default:
                assertUnreachable(stepSellAssetChainNamespace)
            }
          }
        : skipToken,
  })

  return quoteNetworkFeesCryptoBaseUnitQuery
}
