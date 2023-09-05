import type { SignMessageInput } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignMessage } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { numberToHex } from 'web3-utils'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { TradeExecution } from 'lib/swapper/tradeExecution'
import { TradeExecution2 } from 'lib/swapper/tradeExecution2'
import type {
  CosmosSdkTradeExecutionProps,
  CowTradeExecutionProps,
  EvmTradeExecutionProps,
  EvmTransactionRequest,
  TradeExecutionBase,
  TradeQuote,
  UtxoTradeExecutionProps,
} from 'lib/swapper/types'
import { SwapperName, TradeExecutionEvent } from 'lib/swapper/types'
import { assertGetEvmChainAdapter, signAndBroadcast } from 'lib/utils/evm'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import {
  selectActiveStepOrDefault,
  selectIsLastStep,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../useAccountIds'

const WALLET_AGNOSTIC_SWAPPERS = [SwapperName.OneInch, SwapperName.CowSwap]

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

  const { sellAssetAccountId, buyAssetAccountId } = useAccountIds()

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
    if (!buyAssetAccountId) throw Error('missing buyAssetAccountId')

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
          quoteSellAssetAccountId: sellAssetAccountId,
          quoteBuyAssetAccountId: buyAssetAccountId,
          wallet,
          supportsEIP1559,
          slippageTolerancePercentageDecimal,
          getState: store.getState,
        })

        cancelPollingRef.current = output?.cancelPolling
      }

      if (execution.execWalletAgnostic) {
        const accountNumber = accountMetadata.bip44Params.accountNumber
        const chainId = tradeQuote.steps[activeStepOrDefault].sellAsset.chainId
        const adapter = assertGetEvmChainAdapter(chainId)
        const from = await adapter.getAddress({ accountNumber, wallet })
        const account = await adapter.getAccount(from)
        const evm: EvmTradeExecutionProps = {
          from,
          nonce: numberToHex(account.chainSpecific.nonce),
          signAndBroadcastTransaction: async (transactionRequest: EvmTransactionRequest) => {
            const { txToSign } = await adapter.buildCustomTx({
              ...transactionRequest,
              wallet,
              accountNumber,
            })
            return await signAndBroadcast({ adapter, txToSign, wallet })
          },
        }

        const cow: CowTradeExecutionProps = {
          from,
          signMessage: async (message: Uint8Array) => {
            const messageToSign: ETHSignMessage = {
              addressNList: toAddressNList(accountMetadata.bip44Params),
              message,
            }

            const signMessageInput: SignMessageInput<ETHSignMessage> = {
              messageToSign,
              wallet,
            }

            return await adapter.signMessage(signMessageInput)
          },
        }

        // TODO: implement these
        const utxo: UtxoTradeExecutionProps = undefined as unknown as UtxoTradeExecutionProps
        const cosmosSdk: CosmosSdkTradeExecutionProps =
          undefined as unknown as CosmosSdkTradeExecutionProps

        const output = await execution.execWalletAgnostic({
          swapperName,
          tradeQuote,
          stepIndex: activeStepOrDefault,
          slippageTolerancePercentageDecimal,
          evm,
          cow,
          utxo,
          cosmosSdk,
        })

        cancelPollingRef.current = output?.cancelPolling
      }
    })
  }, [
    wallet,
    accountMetadata,
    tradeQuote,
    swapperName,
    sellAssetAccountId,
    buyAssetAccountId,
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
