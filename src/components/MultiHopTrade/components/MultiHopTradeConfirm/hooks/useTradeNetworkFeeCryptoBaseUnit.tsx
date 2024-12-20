import type { StdSignDoc } from '@keplr-wallet/types'
import { bchAssetId, CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { SignTx } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, SolanaSignTx, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  isExecutableTradeQuote,
  SwapperName,
  swappers,
} from '@shapeshiftoss/swapper'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { getConfig } from 'config'
import { useEffect, useMemo, useRef } from 'react'
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
  selectHopSellAccountId,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useTradeNetworkFeeCryptoBaseUnit = (hopIndex: SupportedTradeQuoteStepIndex) => {
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)

  const hopSellAccountIdFilter = useMemo(() => {
    return {
      hopIndex,
    }
  }, [hopIndex])

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

  // This is ugly, but we need to use refs to get around the fact that the
  // poll fn effectively creates a closure and will hold stale variables forever
  // Unless we use refs or another way to get around the closure (e.g hijacking `this`, we are doomed)
  const cancelPollingRef = useRef<() => void | undefined>()

  // cancel on component unmount so polling doesn't cause chaos after the component has unmounted
  useEffect(() => {
    return cancelPollingRef.current
  }, [])

  const hop = useMemo(() => getHopByIndex(tradeQuote, hopIndex), [tradeQuote, hopIndex])
  const swapper = useMemo(() => (swapperName ? swappers[swapperName] : undefined), [swapperName])

  const quoteNetworkFeesCryptoBaseUnitQuery = useQuery({
    queryKey: ['quoteNetworkFeesCryptoBaseUnit', tradeQuote],
    refetchInterval: 5000,
    queryFn:
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

                debugger
                // TODO(gomes): fix types
                const output = await swapper.getEvmTransactionFees({
                  chainId: hop.sellAsset.chainId,
                  tradeQuote,
                  stepIndex: hopIndex,
                  slippageTolerancePercentageDecimal,
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
                cancelPollingRef.current = output?.cancelPolling
                return
              }
              case CHAIN_NAMESPACE.CosmosSdk: {
                const adapter = assertGetCosmosSdkChainAdapter(stepSellAssetChainId)
                const from = await adapter.getAddress({ accountNumber, wallet })
                const output = await execution.execCosmosSdkTransaction({
                  swapperName,
                  tradeQuote,
                  stepIndex: hopIndex,
                  slippageTolerancePercentageDecimal,
                  from,
                  signAndBroadcastTransaction: async (transactionRequest: StdSignDoc) => {
                    const txToSign: SignTx<CosmosSdkChainId> = {
                      addressNList: toAddressNList(adapter.getBip44Params(bip44Params)),
                      tx: {
                        fee: {
                          amount: [...transactionRequest.fee.amount],
                          gas: transactionRequest.fee.gas,
                        },
                        memo: transactionRequest.memo,
                        msg: [...transactionRequest.msgs],
                        signatures: [],
                      },
                      sequence: transactionRequest.sequence,
                      account_number: transactionRequest.account_number,
                      chain_id: transactionRequest.chain_id,
                    }
                    const signedTx = await adapter.signTransaction({
                      txToSign: txToSign as ThorchainSignTx, // TODO: fix cosmos sdk types in hdwallet-core as they misalign and require casting,
                      wallet,
                    })
                    const output = await adapter.broadcastTransaction({
                      senderAddress: from,
                      receiverAddress: tradeQuote.receiveAddress,
                      hex: signedTx,
                    })

                    return output
                  },
                })
                cancelPollingRef.current = output?.cancelPolling
                return
              }
              case CHAIN_NAMESPACE.Solana: {
                const adapter = assertGetSolanaChainAdapter(stepSellAssetChainId)
                const from = await adapter.getAddress({ accountNumber, wallet })
                const output = await execution.execSolanaTransaction({
                  swapperName,
                  tradeQuote,
                  stepIndex: hopIndex,
                  slippageTolerancePercentageDecimal,
                  from,
                  signAndBroadcastTransaction: async (txToSign: SolanaSignTx) => {
                    const signedTx = await adapter.signTransaction({
                      txToSign,
                      wallet,
                    })
                    const output = await adapter.broadcastTransaction({
                      senderAddress: from,
                      receiverAddress: tradeQuote.receiveAddress,
                      hex: signedTx,
                    })

                    return output
                  },
                })
                cancelPollingRef.current = output?.cancelPolling
                return
              }
              default:
                assertUnreachable(stepSellAssetChainNamespace)
            }
          }
        : skipToken,
  })

  return quoteNetworkFeesCryptoBaseUnitQuery
}
