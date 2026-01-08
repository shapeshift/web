import { useToast } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { enterYield, exitYield, fetchAction, manageYield } from '@/lib/yieldxyz/api'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  YIELD_MAX_POLL_ATTEMPTS,
  YIELD_POLL_INTERVAL_MS,
} from '@/lib/yieldxyz/constants'
import type { CosmosStakeArgs } from '@/lib/yieldxyz/executeTransaction'
import { executeTransaction } from '@/lib/yieldxyz/executeTransaction'
import type { ActionDto, AugmentedYieldDto, TransactionDto } from '@/lib/yieldxyz/types'
import { ActionStatus as YieldActionStatus, TransactionStatus } from '@/lib/yieldxyz/types'
import { formatYieldTxTitle } from '@/lib/yieldxyz/utils'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import { useSubmitYieldTransactionHash } from '@/react-queries/queries/yieldxyz/useSubmitYieldTransactionHash'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectFeeAssetByChainId,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export enum ModalStep {
  InProgress = 'in_progress',
  Success = 'success',
}

export type TransactionStep = {
  title: string
  status: 'pending' | 'success' | 'loading'
  originalTitle: string
  txHash?: string
  txUrl?: string
  loadingMessage?: string
}

const poll = async <T>(
  fn: () => Promise<T>,
  isComplete: (result: T) => boolean,
  shouldThrow?: (result: T) => Error | undefined,
): Promise<T> => {
  for (let i = 0; i < YIELD_MAX_POLL_ATTEMPTS; i++) {
    const result = await fn()
    const error = shouldThrow?.(result)
    if (error) throw error
    if (isComplete(result)) return result
    await new Promise(resolve => setTimeout(resolve, YIELD_POLL_INTERVAL_MS))
  }
  throw new Error('Polling timed out')
}

const waitForActionCompletion = (actionId: string): Promise<ActionDto> => {
  return poll(
    () => fetchAction(actionId),
    action => action.status === YieldActionStatus.Success,
    action => {
      if (action.status === YieldActionStatus.Failed) return new Error('Action failed')
      if (action.status === YieldActionStatus.Canceled) return new Error('Action was canceled')
      return undefined
    },
  )
}

const filterExecutableTransactions = (transactions: TransactionDto[]): TransactionDto[] => {
  const seen = new Set<string>()
  return transactions.filter(tx => {
    if (tx.status !== TransactionStatus.Created) return false
    if (seen.has(tx.id)) return false
    seen.add(tx.id)
    return true
  })
}

type UseYieldTransactionFlowProps = {
  yieldItem: AugmentedYieldDto
  action: 'enter' | 'exit' | 'manage'
  amount: string
  assetSymbol: string
  onClose: () => void
  isOpen?: boolean
  validatorAddress?: string
  passthrough?: string
  manageActionType?: string
}

export const useYieldTransactionFlow = ({
  yieldItem,
  action,
  amount,
  assetSymbol,
  onClose,
  isOpen,
  validatorAddress,
  passthrough,
  manageActionType,
}: UseYieldTransactionFlowProps) => {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  const [step, setStep] = useState<ModalStep>(ModalStep.InProgress)
  const [rawTransactions, setRawTransactions] = useState<TransactionDto[]>([])
  const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)
  const [currentActionId, setCurrentActionId] = useState<string | null>(null)

  const submitHashMutation = useSubmitYieldTransactionHash()

  const { chainId: yieldChainId } = yieldItem
  const { accountNumber } = useYieldAccount()

  const accountId = useAppSelector(state => {
    if (!yieldChainId) return undefined
    return selectAccountIdByAccountNumberAndChainId(state)[accountNumber]?.[yieldChainId]
  })

  const feeAsset = useAppSelector(state =>
    yieldChainId ? selectFeeAssetByChainId(state, yieldChainId) : undefined,
  )

  const accountMetadata = useAppSelector(state =>
    accountId ? selectPortfolioAccountMetadataByAccountId(state, { accountId }) : undefined,
  )

  const userAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : ''),
    [accountId],
  )

  const canSubmit = useMemo(
    () =>
      Boolean(
        wallet && accountId && yieldChainId && (action === 'manage' || bnOrZero(amount).gt(0)),
      ),
    [wallet, accountId, yieldChainId, action, amount],
  )

  const txArguments = useMemo(() => {
    if (!yieldItem || !userAddress || !yieldChainId) return null
    if (action !== 'manage' && !amount) return null

    const fields =
      action === 'enter'
        ? yieldItem.mechanics.arguments.enter.fields
        : action === 'exit'
        ? yieldItem.mechanics.arguments.exit.fields
        : []

    const fieldNames = new Set(fields.map(field => field.name))
    const args: Record<string, unknown> = {}

    if (action !== 'manage' && amount) {
      args.amount = amount
    }

    if (fieldNames.has('receiverAddress')) {
      args.receiverAddress = userAddress
    }

    if (fieldNames.has('validatorAddress') && yieldChainId) {
      args.validatorAddress = validatorAddress || DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldChainId]
    }

    if (fieldNames.has('cosmosPubKey') && yieldChainId === cosmosChainId) {
      args.cosmosPubKey = userAddress
    }

    return args
  }, [yieldItem, action, amount, userAddress, yieldChainId, validatorAddress])

  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ['yieldxyz', 'quote', action, yieldItem.id, userAddress, txArguments],
    queryFn: () => {
      if (!txArguments || !userAddress || !yieldItem.id) throw new Error('Missing arguments')

      if (action === 'manage') {
        if (!passthrough) throw new Error('Missing passthrough for manage action')
        return manageYield({
          yieldId: yieldItem.id,
          address: userAddress,
          action: manageActionType || 'CLAIM_REWARDS',
          passthrough,
          arguments: txArguments,
        })
      }

      const fn = action === 'enter' ? enterYield : exitYield
      return fn({ yieldId: yieldItem.id, address: userAddress, arguments: txArguments })
    },
    enabled: !!txArguments && !!wallet && !!accountId && canSubmit && isOpen,
    staleTime: 60_000,
    retry: false,
  })

  const updateStepStatus = useCallback((index: number, updates: Partial<TransactionStep>) => {
    setTransactionSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }, [])

  const showErrorToast = useCallback(
    (titleKey: string, descriptionKey: string) => {
      toast({
        title: translate(titleKey),
        description: translate(descriptionKey),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
    [toast, translate],
  )

  const dispatchNotification = useCallback(
    (tx: TransactionDto, txHash: string) => {
      if (!yieldChainId || !accountId) return

      const isApproval = tx.title?.toLowerCase().includes('approv')
      const actionType = isApproval
        ? ActionType.Approve
        : action === 'enter'
        ? ActionType.Deposit
        : action === 'exit'
        ? ActionType.Withdraw
        : ActionType.Claim

      const displayType = isApproval
        ? GenericTransactionDisplayType.Approve
        : action === 'manage'
        ? GenericTransactionDisplayType.Claim
        : GenericTransactionDisplayType.Yield

      // TODO(gomes): handle claim notifications - there's more logic TBD here (e.g. unbonding periods).
      // For now, KISS and simply don't handle claims in action center.
      if (action === 'manage') return

      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          type: actionType,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType,
            txHash,
            chainId: yieldChainId,
            assetId: (yieldItem.token.assetId || '') as AssetId,
            accountId,
            message: formatYieldTxTitle(tx.title || 'Transaction', assetSymbol),
            amountCryptoPrecision: amount,
          },
        }),
      )
    },
    [dispatch, yieldChainId, accountId, action, yieldItem.token.assetId, assetSymbol, amount],
  )

  const buildCosmosStakeArgs = useCallback((): CosmosStakeArgs | undefined => {
    if (yieldChainId !== cosmosChainId) return undefined

    return {
      validator: validatorAddress || (DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[cosmosChainId] ?? ''),
      amountCryptoBaseUnit: bnOrZero(amount)
        .times(bnOrZero(10).pow(yieldItem.token.decimals))
        .toFixed(0),
      action: action === 'enter' ? 'stake' : action === 'exit' ? 'unstake' : 'claim',
    }
  }, [yieldChainId, validatorAddress, amount, yieldItem.token.decimals, action])

  const executeSingleTransaction = useCallback(
    async (
      tx: TransactionDto,
      index: number,
      allTransactions: TransactionDto[],
      actionId: string,
    ) => {
      if (!wallet || !accountId || !yieldChainId) {
        throw new Error(translate('yieldXYZ.errors.walletNotConnected'))
      }

      updateStepStatus(index, {
        status: 'loading',
        loadingMessage: translate('yieldXYZ.loading.signInWallet'),
      })
      setIsSubmitting(true)

      try {
        const txHash = await executeTransaction({
          tx,
          chainId: yieldChainId,
          wallet,
          accountId,
          userAddress,
          bip44Params: accountMetadata?.bip44Params,
          cosmosStakeArgs: buildCosmosStakeArgs(),
        })

        if (!txHash) throw new Error(translate('yieldXYZ.errors.broadcastFailed'))

        const txUrl = feeAsset ? `${feeAsset.explorerTxLink}${txHash}` : ''

        updateStepStatus(index, { txHash, txUrl, loadingMessage: translate('common.confirming') })

        await submitHashMutation.mutateAsync({
          transactionId: tx.id,
          hash: txHash,
          yieldId: yieldItem.id,
          address: userAddress,
        })

        const isLastTransaction = index + 1 >= allTransactions.length

        if (isLastTransaction) {
          await waitForActionCompletion(actionId)
          queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
          queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })
          dispatchNotification(tx, txHash)
          updateStepStatus(index, { status: 'success', loadingMessage: undefined })
          setStep(ModalStep.Success)
        } else {
          const freshAction = await fetchAction(actionId)
          const nextTx = freshAction.transactions.find(
            t => t.status === TransactionStatus.Created && t.stepIndex === index + 1,
          )

          if (nextTx) {
            updateStepStatus(index, { status: 'success', loadingMessage: undefined })
            setRawTransactions(prev => prev.map((t, i) => (i === index + 1 ? nextTx : t)))
            setActiveStepIndex(index + 1)
          } else {
            await waitForActionCompletion(actionId)
            queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
            queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })
            dispatchNotification(tx, txHash)
            updateStepStatus(index, { status: 'success', loadingMessage: undefined })
            setStep(ModalStep.Success)
          }
        }
      } catch (error) {
        console.error('Transaction execution failed:', error)
        showErrorToast(
          'yieldXYZ.errors.transactionFailedTitle',
          'yieldXYZ.errors.transactionFailedDescription',
        )
        updateStepStatus(index, { status: 'pending', loadingMessage: undefined })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      wallet,
      accountId,
      yieldChainId,
      userAddress,
      accountMetadata?.bip44Params,
      feeAsset,
      yieldItem.id,
      translate,
      updateStepStatus,
      buildCosmosStakeArgs,
      submitHashMutation,
      queryClient,
      dispatchNotification,
      showErrorToast,
    ],
  )

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setStep(ModalStep.InProgress)
    setTransactionSteps([])
    setRawTransactions([])
    setActiveStepIndex(-1)
    setCurrentActionId(null)
    onClose()
  }, [isSubmitting, onClose])

  const handleConfirm = useCallback(async () => {
    if (activeStepIndex >= 0 && rawTransactions[activeStepIndex] && currentActionId) {
      await executeSingleTransaction(
        rawTransactions[activeStepIndex],
        activeStepIndex,
        rawTransactions,
        currentActionId,
      )
      return
    }

    if (!yieldChainId) {
      showErrorToast(
        'yieldXYZ.errors.unsupportedNetworkTitle',
        'yieldXYZ.errors.unsupportedNetworkDescription',
      )
      return
    }

    if (!wallet || !accountId) {
      showErrorToast(
        'yieldXYZ.errors.walletNotConnectedTitle',
        'yieldXYZ.errors.walletNotConnectedDescription',
      )
      return
    }

    if (action !== 'manage' && !bnOrZero(amount).gt(0)) {
      showErrorToast('yieldXYZ.errors.enterAmountTitle', 'yieldXYZ.errors.enterAmountDescription')
      return
    }

    if (quoteError) {
      showErrorToast('yieldXYZ.errors.quoteFailedTitle', 'yieldXYZ.errors.quoteFailedDescription')
      return
    }

    if (!quoteData) return

    setIsSubmitting(true)
    setTransactionSteps([
      {
        title: translate('yieldXYZ.loading.preparingTransaction'),
        status: 'loading',
        originalTitle: '',
      },
    ])

    try {
      const transactions = filterExecutableTransactions(quoteData.transactions)

      if (transactions.length === 0) {
        setStep(ModalStep.Success)
        setIsSubmitting(false)
        return
      }

      setCurrentActionId(quoteData.id)
      setRawTransactions(transactions)
      setTransactionSteps(
        transactions.map((tx, i) => ({
          title: formatYieldTxTitle(tx.title || `Transaction ${i + 1}`, assetSymbol),
          originalTitle: tx.title || '',
          status: 'pending' as const,
        })),
      )
      setActiveStepIndex(0)

      await executeSingleTransaction(transactions[0], 0, transactions, quoteData.id)
    } catch (error) {
      console.error('Failed to initiate action:', error)
      showErrorToast(
        'yieldXYZ.errors.initiateFailedTitle',
        'yieldXYZ.errors.initiateFailedDescription',
      )
      setIsSubmitting(false)
      setTransactionSteps([])
    }
  }, [
    activeStepIndex,
    rawTransactions,
    currentActionId,
    yieldChainId,
    wallet,
    accountId,
    action,
    amount,
    quoteError,
    quoteData,
    assetSymbol,
    translate,
    showErrorToast,
    executeSingleTransaction,
  ])

  return useMemo(
    () => ({
      step,
      transactionSteps,
      isSubmitting,
      activeStepIndex,
      canSubmit,
      handleConfirm,
      handleClose,
      isQuoteLoading,
    }),
    [
      step,
      transactionSteps,
      isSubmitting,
      activeStepIndex,
      canSubmit,
      handleConfirm,
      handleClose,
      isQuoteLoading,
    ],
  )
}
