import type { StdSignDoc } from '@keplr-wallet/types'
import { bchAssetId, CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { SignMessageInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { BuildCustomTxInput } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { BTCSignTx, ETHSignMessage, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useEffect, useRef } from 'react'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { TradeExecution } from 'lib/swapper/tradeExecution'
import type { EvmTransactionRequest } from 'lib/swapper/types'
import { SwapperName, TradeExecutionEvent } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, signAndBroadcast } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import {
  selectFirstHopSellAccountId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveSwapperName,
  selectSecondHopSellAccountId,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useTradeExecution = (hopIndex: number) => {
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const { showErrorToast } = useErrorHandler()

  const sellAssetAccountId = useAppSelector(
    hopIndex === 0 ? selectFirstHopSellAccountId : selectSecondHopSellAccountId,
  )

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
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

  const executeTrade = useCallback(() => {
    if (!wallet) throw Error('missing wallet')
    if (!accountMetadata) throw Error('missing accountMetadata')
    if (!tradeQuote) throw Error('missing tradeQuote')
    if (!swapperName) throw Error('missing swapperName')
    if (!sellAssetAccountId) throw Error('missing sellAssetAccountId')

    return new Promise<void>(async resolve => {
      dispatch(tradeQuoteSlice.actions.setSwapTxPending({ hopIndex }))

      const onFail = (e: unknown) => {
        dispatch(tradeQuoteSlice.actions.setSwapTxFailed({ hopIndex }))
        showErrorToast(e)
        resolve()
      }

      const execution = new TradeExecution()

      execution.on(TradeExecutionEvent.SellTxHash, ({ sellTxHash }) => {
        dispatch(tradeQuoteSlice.actions.setSwapSellTxHash({ hopIndex, sellTxHash }))
      })
      execution.on(TradeExecutionEvent.Status, ({ buyTxHash }) => {
        buyTxHash && tradeQuoteSlice.actions.setSwapBuyTxHash({ hopIndex, buyTxHash })
      })
      execution.on(TradeExecutionEvent.Success, () => {
        dispatch(tradeQuoteSlice.actions.setSwapTxComplete({ hopIndex }))
        resolve()
      })
      execution.on(TradeExecutionEvent.Fail, onFail)
      execution.on(TradeExecutionEvent.Error, onFail)

      const { accountType, bip44Params } = accountMetadata
      const accountNumber = bip44Params.accountNumber
      const stepSellAssetChainId = tradeQuote.steps[hopIndex].sellAsset.chainId
      const stepSellAssetAssetId = tradeQuote.steps[hopIndex].sellAsset.assetId
      const stepBuyAssetAssetId = tradeQuote.steps[hopIndex].buyAsset.assetId

      if (swapperName === SwapperName.CowSwap) {
        const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
        const from = await adapter.getAddress({ accountNumber, wallet })

        const output = await execution.execEvmMessage({
          swapperName,
          tradeQuote,
          stepIndex: hopIndex,
          slippageTolerancePercentageDecimal,
          from,
          signMessage: async (message: string) => {
            const messageToSign: ETHSignMessage = {
              addressNList: toAddressNList(bip44Params),
              message,
            }

            const signMessageInput: SignMessageInput<ETHSignMessage> = {
              messageToSign,
              wallet,
            }

            return await adapter.signMessage(signMessageInput)
          },
        })

        cancelPollingRef.current = output?.cancelPolling
        return
      }

      const { chainNamespace: stepSellAssetChainNamespace } = fromChainId(stepSellAssetChainId)

      const receiverAddress =
        tradeQuote.receiveAddress && stepBuyAssetAssetId === bchAssetId
          ? tradeQuote.receiveAddress.replace('bitcoincash:', '')
          : tradeQuote.receiveAddress

      switch (stepSellAssetChainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          const adapter = assertGetEvmChainAdapter(stepSellAssetChainId)
          const from = await adapter.getAddress({ accountNumber, wallet })
          const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

          const output = await execution.execEvmTransaction({
            swapperName,
            tradeQuote,
            stepIndex: hopIndex,
            slippageTolerancePercentageDecimal,
            from,
            supportsEIP1559,
            signAndBroadcastTransaction: async (transactionRequest: EvmTransactionRequest) => {
              const { txToSign } = await adapter.buildCustomTx({
                ...transactionRequest,
                wallet,
                accountNumber,
              } as BuildCustomTxInput)
              return await signAndBroadcast({
                adapter,
                txToSign,
                wallet,
                senderAddress: from,
                receiverAddress,
              })
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.Utxo: {
          if (accountType === undefined) throw Error('Missing UTXO account type')
          const adapter = assertGetUtxoChainAdapter(stepSellAssetChainId)
          const { xpub } = await adapter.getPublicKey(wallet, accountNumber, accountType)
          const _senderAddress = await adapter.getAddress({ accountNumber, accountType, wallet })
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
            accountType,
            signAndBroadcastTransaction: async (txToSign: BTCSignTx) => {
              const signedTx = await adapter.signTransaction({
                txToSign,
                wallet,
              })
              return adapter.broadcastTransaction({
                senderAddress,
                receiverAddress,
                hex: signedTx,
              })
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
              const txToSign: ThorchainSignTx = {
                addressNList: toAddressNList(bip44Params),
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
                txToSign,
                wallet,
              })
              return adapter.broadcastTransaction({
                senderAddress: from,
                receiverAddress: tradeQuote.receiveAddress,
                hex: signedTx,
              })
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        default:
          assertUnreachable(stepSellAssetChainNamespace)
      }
    })
  }, [
    wallet,
    accountMetadata,
    tradeQuote,
    swapperName,
    sellAssetAccountId,
    dispatch,
    hopIndex,
    showErrorToast,
    slippageTolerancePercentageDecimal,
  ])

  return executeTrade
}
