import type { StdSignDoc } from '@keplr-wallet/types'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { SignMessageInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { BuildCustomTxInput } from '@shapeshiftoss/chain-adapters/src/evm/types'
import type { BTCSignTx, ETHSignMessage, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { TradeExecution } from 'lib/swapper/tradeExecution'
import { TradeExecution2 } from 'lib/swapper/tradeExecution2'
import type { EvmTransactionRequest, TradeExecutionBase, TradeQuote } from 'lib/swapper/types'
import { SwapperName, TradeExecutionEvent } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, signAndBroadcast } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import {
  selectActiveStepOrDefault,
  selectIsLastStep,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../useAccountIds'

const WALLET_AGNOSTIC_SWAPPERS = [SwapperName.OneInch, SwapperName.CowSwap, SwapperName.Thorchain]

export const useTradeExecution = ({
  swapperName,
  tradeQuote,
}: {
  swapperName?: SwapperName
  tradeQuote?: TradeQuote
}) => {
  const dispatch = useAppDispatch()

  const [sellTxHash, setSellTxHash] = useState<string | undefined>()
  const [buyTxHash, setBuyTxHash] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const [tradeStatus, setTradeStatus] = useState<TxStatus>(TxStatus.Unknown)
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const { showErrorToast } = useErrorHandler()

  const { sellAssetAccountId } = useAccountIds()

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const activeStepOrDefault = useAppSelector(selectActiveStepOrDefault)
  const isLastStep = useAppSelector(selectIsLastStep)

  // This is ugly, but we need to use refs to get around the fact that the
  // poll fn effectively creates a closure and will hold stale variables forever
  // Unless we use refs or another way to get around the closure (e.g hijacking `this`, we are doomed)
  const sellTxHashRef = useRef<string | undefined>()
  const isLastStepRef = useRef<boolean>(false)
  const cancelPollingRef = useRef<() => void | undefined>()

  // cancel on component unmount so polling doesn't cause chaos after the component has unmounted
  useEffect(() => {
    return cancelPollingRef.current
  }, [])

  const executeTrade = useCallback(async () => {
    if (!wallet) throw Error('missing wallet')
    if (!accountMetadata) throw Error('missing accountMetadata')
    if (!tradeQuote) throw Error('missing tradeQuote')
    if (!swapperName) throw Error('missing swapperName')
    if (!sellAssetAccountId) throw Error('missing sellAssetAccountId')

    const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

    return new Promise<void>(async (resolve, reject) => {
      // TODO: remove old TradeExecution class when all swappers migrated to TradeExecution2
      const execution: TradeExecutionBase = WALLET_AGNOSTIC_SWAPPERS.includes(swapperName)
        ? new TradeExecution2()
        : new TradeExecution()

      execution.on(TradeExecutionEvent.Error, reject)
      execution.on(TradeExecutionEvent.SellTxHash, ({ sellTxHash }) => {
        setSellTxHash(sellTxHash)
      })
      execution.on(TradeExecutionEvent.Status, ({ status, message, buyTxHash }) => {
        // TODO(gomes): do we want to bring in the concept of watching for a step execution in addition to trade execution?
        // useTradeExecution seems to revolve around the idea of a holistic trade execution i.e a sell/buy asset for the whole trade,
        // but we may want to make this granular to the step level?
        if (isLastStepRef.current || status === TxStatus.Failed) {
          setMessage(message)
          setBuyTxHash(buyTxHash)
          setTradeStatus(status)
        }

        // Tx confirmed/pending for a mid-trade hop, meaning the trade is still pending holistically
        else if (status === TxStatus.Confirmed || status === TxStatus.Pending) {
          setTradeStatus(TxStatus.Pending)
        }
      })
      execution.on(TradeExecutionEvent.Success, () => {
        dispatch(tradeQuoteSlice.actions.incrementStep())
        resolve()
      })
      execution.on(TradeExecutionEvent.Fail, cause => {
        reject(new Error('Transaction failed', { cause }))
      })

      // execute the trade and attach then cancel callback
      if (execution.exec) {
        const output = await execution.exec?.({
          swapperName,
          tradeQuote,
          stepIndex: activeStepOrDefault,
          accountMetadata,
          wallet,
          supportsEIP1559,
          slippageTolerancePercentageDecimal,
          getState: store.getState,
        })

        cancelPollingRef.current = output?.cancelPolling
      }

      const { accountType, bip44Params } = accountMetadata
      const accountNumber = bip44Params.accountNumber
      const chainId = tradeQuote.steps[activeStepOrDefault].sellAsset.chainId

      if (swapperName === SwapperName.CowSwap) {
        if (!execution.execEvmMessage) throw Error('Missing swapper implementation')
        const adapter = assertGetEvmChainAdapter(chainId)
        const from = await adapter.getAddress({ accountNumber, wallet })
        const output = await execution.execEvmMessage({
          swapperName,
          tradeQuote,
          stepIndex: activeStepOrDefault,
          slippageTolerancePercentageDecimal,
          from,
          signMessage: async (message: Uint8Array) => {
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

      const { chainNamespace } = fromChainId(chainId)

      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          if (!execution.execEvmTransaction) throw Error('Missing swapper implementation')
          const adapter = assertGetEvmChainAdapter(chainId)
          const from = await adapter.getAddress({ accountNumber, wallet })
          const output = await execution.execEvmTransaction({
            swapperName,
            tradeQuote,
            stepIndex: activeStepOrDefault,
            slippageTolerancePercentageDecimal,
            from,
            signAndBroadcastTransaction: async (transactionRequest: EvmTransactionRequest) => {
              const { txToSign } = await adapter.buildCustomTx({
                ...transactionRequest,
                wallet,
                accountNumber,
              } as BuildCustomTxInput)
              return await signAndBroadcast({ adapter, txToSign, wallet })
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.Utxo: {
          if (!execution.execUtxoTransaction) throw Error('Missing swapper implementation')
          if (accountType === undefined) throw Error('Missing UTXO account type')
          const adapter = assertGetUtxoChainAdapter(chainId)
          const { xpub } = await adapter.getPublicKey(wallet, accountNumber, accountType)
          const output = await execution.execUtxoTransaction({
            swapperName,
            tradeQuote,
            stepIndex: activeStepOrDefault,
            slippageTolerancePercentageDecimal,
            xpub,
            accountType,
            signAndBroadcastTransaction: async (txToSign: BTCSignTx) => {
              const signedTx = await adapter.signTransaction({
                txToSign,
                wallet,
              })
              return adapter.broadcastTransaction(signedTx)
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        case CHAIN_NAMESPACE.CosmosSdk: {
          if (!execution.execCosmosSdkTransaction) throw Error('Missing swapper implementation')
          const adapter = assertGetCosmosSdkChainAdapter(chainId)
          const from = await adapter.getAddress({ accountNumber, wallet })
          const output = await execution.execCosmosSdkTransaction({
            swapperName,
            tradeQuote,
            stepIndex: activeStepOrDefault,
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
              return adapter.broadcastTransaction(signedTx)
            },
          })
          cancelPollingRef.current = output?.cancelPolling
          return
        }
        default:
          assertUnreachable(chainNamespace)
      }
    })
  }, [
    wallet,
    accountMetadata,
    tradeQuote,
    swapperName,
    sellAssetAccountId,
    activeStepOrDefault,
    slippageTolerancePercentageDecimal,
    dispatch,
  ])

  useEffect(() => {
    sellTxHashRef.current = sellTxHash
    isLastStepRef.current = isLastStep
  }, [sellTxHash, isLastStep])

  useEffect(() => {
    // First step will always be ran from the executeTrade call fired by onSubmit()
    // Subsequent steps will be ran here, following incrementStep() after step completion
    if (activeStepOrDefault !== 0) {
      void executeTrade().catch(showErrorToast)
    }
  }, [activeStepOrDefault, executeTrade, showErrorToast])

  return { executeTrade, sellTxHash, buyTxHash, message, tradeStatus }
}
