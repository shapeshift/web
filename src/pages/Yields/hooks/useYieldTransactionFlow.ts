import { useToast } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  CHAIN_NAMESPACE,
  cosmosChainId,
  ethChainId,
  fromAccountId,
  fromChainId,
  usdtAssetId,
} from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Hash } from 'viem'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import { parseAndUpsertSecondClassChainTx } from '@/lib/utils/secondClassChainTx'
import { enterYield, exitYield, fetchAction, manageYield } from '@/lib/yieldxyz/api'
import { YIELD_MAX_POLL_ATTEMPTS, YIELD_POLL_INTERVAL_MS } from '@/lib/yieldxyz/constants'
import type { CosmosStakeArgs } from '@/lib/yieldxyz/executeTransaction'
import { executeTransaction } from '@/lib/yieldxyz/executeTransaction'
import type { ActionDto, AugmentedYieldDto, TransactionDto } from '@/lib/yieldxyz/types'
import { ActionStatus as YieldActionStatus, TransactionStatus } from '@/lib/yieldxyz/types'
import {
  formatYieldTxTitle,
  getDefaultValidatorForYield,
  resolveAssetSymbolForTx,
} from '@/lib/yieldxyz/utils'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import { reactQueries } from '@/react-queries'
import { useAllowance } from '@/react-queries/hooks/useAllowance'
import { useSubmitYieldTransactionHash } from '@/react-queries/queries/yieldxyz/useSubmitYieldTransactionHash'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  isGenericTransactionAction,
} from '@/state/slices/actionSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectFeeAssetByChainId,
} from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export enum ModalStep {
  InProgress = 'in_progress',
  Success = 'success',
}

export type TransactionStep = {
  title: string
  status: 'pending' | 'success' | 'loading' | 'failed'
  originalTitle: string
  type?: string
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

export const waitForActionCompletion = (actionId: string): Promise<ActionDto> =>
  poll(
    () => fetchAction(actionId),
    action => action.status === YieldActionStatus.Success,
    action => {
      if (action.status === YieldActionStatus.Failed) return new Error('Action failed')
      if (action.status === YieldActionStatus.Canceled) return new Error('Action was canceled')
      return undefined
    },
  )

export const waitForTransactionConfirmation = (
  actionId: string,
  transactionId: string,
): Promise<ActionDto> =>
  poll(
    () => fetchAction(actionId),
    action => {
      const tx = action.transactions.find(t => t.id === transactionId)
      if (!tx) return false
      return tx.status !== TransactionStatus.Created
    },
    action => {
      if (action.status === YieldActionStatus.Failed) return new Error('Action failed')
      if (action.status === YieldActionStatus.Canceled) return new Error('Action was canceled')
      const tx = action.transactions.find(t => t.id === transactionId)
      if (tx?.status === TransactionStatus.Failed) return new Error('Transaction failed')
      return undefined
    },
  )

export const filterExecutableTransactions = (transactions: TransactionDto[]): TransactionDto[] => {
  const seen = new Set<string>()
  return transactions.filter(tx => {
    if (tx.status !== TransactionStatus.Created) return false
    if (seen.has(tx.id)) return false
    seen.add(tx.id)
    return true
  })
}

export const getSpenderFromApprovalTx = (tx: TransactionDto): string | null => {
  try {
    const parsed = JSON.parse(tx.unsignedTransaction)
    const data = parsed.data as string | undefined
    if (!data || !data.toLowerCase().startsWith('0x095ea7b3')) return null
    return ('0x' + data.slice(10, 74).slice(-40)).toLowerCase()
  } catch {
    return null
  }
}

export const isApprovalTransaction = (tx: TransactionDto): boolean => {
  const type = tx.type?.toUpperCase()
  return type === 'APPROVE' || type === 'APPROVAL'
}

export const isUsdtOnEthereumMainnet = (
  assetId: string | undefined,
  chainId: ChainId | undefined,
): boolean => {
  return assetId === usdtAssetId && chainId === ethChainId
}

type UseYieldTransactionFlowProps = {
  yieldItem: AugmentedYieldDto | undefined
  action: 'enter' | 'exit' | 'manage'
  amount: string
  assetSymbol: string
  onClose: () => void
  isOpen?: boolean
  validatorAddress?: string
  passthrough?: string
  manageActionType?: string
  accountId?: string
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
  accountId: accountIdProp,
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
  const [resetTxHash, setResetTxHash] = useState<string | null>(null)
  const committedAmountRef = useRef('')

  const isUsdtApprovalResetEnabled = useFeatureFlag('UsdtApprovalReset')
  const submitHashMutation = useSubmitYieldTransactionHash()

  const inputTokenAssetId = useMemo(() => yieldItem?.inputTokens?.[0]?.assetId, [yieldItem])
  const outputTokenSymbol = yieldItem?.outputToken?.symbol

  const resolveSymbolForTx = useCallback(
    (txType?: string) => resolveAssetSymbolForTx(txType, action, assetSymbol, outputTokenSymbol),
    [action, assetSymbol, outputTokenSymbol],
  )

  const yieldChainId = yieldItem?.chainId
  const { accountId: contextAccountId, accountNumber: contextAccountNumber } = useYieldAccount()

  const accountId = useAppSelector(state => {
    if (accountIdProp) return accountIdProp
    if (contextAccountId) return contextAccountId
    if (!yieldChainId) return undefined
    if (contextAccountNumber === undefined) return undefined
    return selectAccountIdByAccountNumberAndChainId(state)[contextAccountNumber]?.[yieldChainId]
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

    const getFields = () => {
      if (action === 'enter') return yieldItem.mechanics.arguments.enter.fields
      if (action === 'exit') return yieldItem.mechanics.arguments.exit.fields
      return []
    }
    const fields = getFields()

    const fieldNames = new Set(fields.map(field => field.name))
    const args: Record<string, unknown> = {}

    if (action !== 'manage' && amount) {
      args.amount = amount
    }

    if (fieldNames.has('receiverAddress')) {
      args.receiverAddress = userAddress
    }

    const validatorField = fields.find(f => f.name === 'validatorAddress')
    if (validatorField && yieldItem) {
      args.validatorAddress = validatorAddress || getDefaultValidatorForYield(yieldItem.id)
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
    queryKey: ['yieldxyz', 'quote', action, yieldItem?.id, userAddress, txArguments],
    queryFn: () => {
      if (!txArguments || !userAddress || !yieldItem?.id) throw new Error('Missing arguments')

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
    enabled: !!txArguments && !!wallet && !!accountId && !!yieldItem && canSubmit && isOpen,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  // USDT reset logic - only for enter action on USDT/ETH
  const approvalSpender = useMemo(() => {
    if (action !== 'enter') return null
    if (!quoteData?.transactions) return null
    const createdTransactions = quoteData.transactions.filter(
      tx => tx.status === TransactionStatus.Created,
    )
    const approvalTx = createdTransactions.find(isApprovalTransaction)
    if (!approvalTx) return null
    return getSpenderFromApprovalTx(approvalTx)
  }, [action, quoteData?.transactions])

  const allowanceQuery = useAllowance({
    assetId: inputTokenAssetId,
    spender: approvalSpender ?? undefined,
    from: userAddress || undefined,
    isDisabled:
      !approvalSpender ||
      !isUsdtApprovalResetEnabled ||
      action !== 'enter' ||
      !isUsdtOnEthereumMainnet(inputTokenAssetId, yieldChainId),
    isRefetchEnabled: true,
  })

  const isUsdtResetRequired = useMemo(() => {
    if (action !== 'enter') return false
    if (!isUsdtApprovalResetEnabled) return false
    if (!isUsdtOnEthereumMainnet(inputTokenAssetId, yieldChainId)) return false
    if (!approvalSpender) return false
    if (!allowanceQuery.data) return false
    return bnOrZero(allowanceQuery.data).gt(0)
  }, [
    action,
    isUsdtApprovalResetEnabled,
    inputTokenAssetId,
    yieldChainId,
    approvalSpender,
    allowanceQuery.data,
  ])

  // Check if we're waiting for USDT allowance check before we can determine reset requirement
  const isAllowanceCheckPending = useMemo(() => {
    if (action !== 'enter') return false
    if (!isUsdtApprovalResetEnabled) return false
    if (!isUsdtOnEthereumMainnet(inputTokenAssetId, yieldChainId)) return false
    if (!approvalSpender) return false
    // If we have an approval spender for USDT but allowance data hasn't loaded yet
    return allowanceQuery.data === undefined && !allowanceQuery.isError
  }, [
    action,
    isUsdtApprovalResetEnabled,
    inputTokenAssetId,
    yieldChainId,
    approvalSpender,
    allowanceQuery.data,
    allowanceQuery.isError,
  ])

  const displaySteps = useMemo((): TransactionStep[] => {
    if (transactionSteps.length > 0) {
      return transactionSteps
    }
    if (isAllowanceCheckPending) return []
    if (quoteData?.transactions?.length) {
      const steps: TransactionStep[] = []
      if (isUsdtResetRequired) {
        steps.push({
          title: translate('yieldXYZ.resetAllowance'),
          originalTitle: 'Reset Allowance',
          type: 'RESET',
          status: 'pending' as const,
        })
      }
      steps.push(
        ...quoteData.transactions
          .filter(tx => tx.status === TransactionStatus.Created)
          .map((tx, i) => ({
            title: formatYieldTxTitle(
              tx.title || `Transaction ${i + 1}`,
              resolveSymbolForTx(tx.type),
              yieldItem?.mechanics.type,
              tx.type,
            ),
            originalTitle: tx.title || '',
            type: tx.type,
            status: 'pending' as const,
          })),
      )
      return steps
    }
    return []
  }, [
    transactionSteps,
    quoteData,
    resolveSymbolForTx,
    yieldItem?.mechanics.type,
    isAllowanceCheckPending,
    isUsdtResetRequired,
    translate,
  ])

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
    (
      tx: TransactionDto,
      txHash: string,
      options?: {
        status?: ActionStatus
        id?: string
        yieldActionId?: string
      },
    ) => {
      if (!yieldChainId || !accountId || !yieldItem) return
      if (!yieldItem.token.assetId) {
        console.warn('[useYieldTransactionFlow] Cannot dispatch notification: missing assetId')
        return
      }

      const status = options?.status ?? ActionStatus.Complete
      const id = options?.id ?? uuidv4()

      const isApproval = tx.title?.toLowerCase().includes('approv')

      type GenericActionType =
        | typeof ActionType.Approve
        | typeof ActionType.Deposit
        | typeof ActionType.Withdraw
        | typeof ActionType.Claim

      const getActionType = (): GenericActionType => {
        if (isApproval) return ActionType.Approve
        if (action === 'enter') return ActionType.Deposit
        if (action === 'exit') return ActionType.Withdraw
        return ActionType.Claim
      }
      const actionType = getActionType()

      const getDisplayType = (): GenericTransactionDisplayType => {
        if (isApproval) return GenericTransactionDisplayType.Approve
        if (action === 'manage') return GenericTransactionDisplayType.Claim
        return GenericTransactionDisplayType.Yield
      }
      const displayType = getDisplayType()

      const pendingMessagesMap: Partial<Record<ActionType, string>> = {
        [ActionType.Deposit]: 'actionCenter.deposit.pending',
        [ActionType.Withdraw]: 'actionCenter.withdrawal.pending',
        [ActionType.Claim]: 'actionCenter.claim.pending',
      }

      const completeMessagesMap: Partial<Record<ActionType, string>> = {
        [ActionType.Deposit]: 'actionCenter.deposit.complete',
        [ActionType.Withdraw]: 'actionCenter.withdrawal.complete',
        [ActionType.Approve]: 'actionCenter.approve.approvalTxComplete',
        [ActionType.Claim]: 'actionCenter.claim.complete',
      }

      const messagesMap = status === ActionStatus.Pending ? pendingMessagesMap : completeMessagesMap

      dispatch(
        actionSlice.actions.upsertAction({
          id,
          type: actionType,
          status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType,
            txHash,
            chainId: yieldChainId,
            assetId: yieldItem.token.assetId as AssetId,
            accountId,
            message:
              messagesMap[actionType] ??
              formatYieldTxTitle(
                tx.title || 'Transaction',
                resolveSymbolForTx(tx.type),
                yieldItem.mechanics.type,
                tx.type,
              ),
            amountCryptoPrecision: amount,
            contractName: yieldItem.metadata.name,
            chainName: yieldItem.network,
            yieldType: yieldItem.mechanics.type,
            cooldownPeriodSeconds: yieldItem.mechanics.cooldownPeriod?.seconds,
            yieldActionId: options?.yieldActionId,
            yieldId: yieldItem.id,
          },
        }),
      )
    },
    [dispatch, yieldChainId, accountId, action, yieldItem, resolveSymbolForTx, amount],
  )

  const buildCosmosStakeArgs = useCallback((): CosmosStakeArgs | undefined => {
    if (yieldChainId !== cosmosChainId || !yieldItem) return undefined

    const validator = validatorAddress || getDefaultValidatorForYield(yieldItem.id)
    if (!validator) return undefined

    const inputTokenDecimals =
      yieldItem.inputTokens?.[0]?.decimals ?? yieldItem.token?.decimals ?? 18

    return {
      validator,
      amountCryptoBaseUnit: toBaseUnit(amount, inputTokenDecimals),
      action: action === 'enter' ? 'stake' : action === 'exit' ? 'unstake' : 'claim',
    }
  }, [yieldChainId, validatorAddress, amount, yieldItem, action])

  const executeResetAllowance = useCallback(async () => {
    if (!wallet || !accountId || !inputTokenAssetId || !approvalSpender) {
      throw new Error(translate('yieldXYZ.errors.walletNotConnected'))
    }

    setIsSubmitting(true)
    updateStepStatus(0, {
      status: 'loading',
    })

    try {
      const txHash = await reactQueries.mutations
        .approve({
          assetId: inputTokenAssetId,
          spender: approvalSpender,
          amountCryptoBaseUnit: '0',
          accountNumber: accountMetadata?.bip44Params?.accountNumber ?? 0,
          wallet,
          from: userAddress,
        })
        .mutationFn()

      if (!txHash) throw new Error(translate('yieldXYZ.errors.broadcastFailed'))

      setResetTxHash(txHash)
      const txUrl = feeAsset?.explorerTxLink ? `${feeAsset.explorerTxLink}${txHash}` : ''
      updateStepStatus(0, { txHash, txUrl, loadingMessage: translate('common.confirming') })

      const publicClient = assertGetViemClient(ethChainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      await allowanceQuery.refetch()
      updateStepStatus(0, { status: 'success', loadingMessage: undefined })
      setActiveStepIndex(1)
    } catch (error) {
      console.error('Reset allowance failed:', error)
      toast({
        title: translate('yieldXYZ.errors.transactionFailedTitle'),
        description:
          error instanceof Error
            ? error.message
            : translate('yieldXYZ.errors.transactionFailedDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      updateStepStatus(0, { status: 'failed', loadingMessage: undefined })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    wallet,
    accountId,
    inputTokenAssetId,
    approvalSpender,
    accountMetadata?.bip44Params?.accountNumber,
    userAddress,
    feeAsset?.explorerTxLink,
    translate,
    updateStepStatus,
    toast,
    allowanceQuery,
  ])

  const executeSingleTransaction = useCallback(
    async (
      tx: TransactionDto,
      yieldTxIndex: number,
      uiStepIndex: number,
      allTransactions: TransactionDto[],
      actionId: string,
    ) => {
      if (!wallet || !accountId || !yieldChainId) {
        throw new Error(translate('yieldXYZ.errors.walletNotConnected'))
      }

      updateStepStatus(uiStepIndex, {
        status: 'loading',
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

        updateStepStatus(uiStepIndex, {
          txHash,
          txUrl,
          loadingMessage: translate('common.confirming'),
        })

        if (!yieldItem?.id) throw new Error('Missing yield item')
        await submitHashMutation.mutateAsync({
          transactionId: tx.id,
          hash: txHash,
          yieldId: yieldItem.id,
          address: userAddress,
        })

        const isLastTransaction = yieldTxIndex + 1 >= allTransactions.length

        const completeLastYieldTransaction = async () => {
          const yieldActionUuid = uuidv4()

          dispatchNotification(tx, txHash, {
            status: ActionStatus.Pending,
            id: yieldActionUuid,
            yieldActionId: actionId,
          })

          await waitForActionCompletion(actionId)
          await queryClient.refetchQueries({ queryKey: ['yieldxyz', 'allBalances'] })
          await queryClient.refetchQueries({ queryKey: ['yieldxyz', 'yields'] })

          try {
            await parseAndUpsertSecondClassChainTx({
              chainId: yieldChainId,
              txHash,
              accountId,
              dispatch,
            })
          } catch (e) {
            console.error('Failed to parse yield Tx:', e)
          }

          // After completing a claim (manage), transition existing ClaimAvailable actions to Claimed
          if (action === 'manage' && yieldItem?.id) {
            dispatchNotification(tx, txHash, {
              status: ActionStatus.Complete,
              id: yieldActionUuid,
            })

            const state = store.getState()
            const actionsById = actionSlice.selectors.selectActionsById(state)
            const actionIds = actionSlice.selectors.selectActionIds(state)
            for (const storeActionId of actionIds) {
              const existingAction = actionsById[storeActionId]
              if (
                isGenericTransactionAction(existingAction) &&
                existingAction.status === ActionStatus.ClaimAvailable &&
                existingAction.transactionMetadata.displayType ===
                  GenericTransactionDisplayType.Claim &&
                existingAction.transactionMetadata.yieldId === yieldItem.id
              ) {
                dispatch(
                  actionSlice.actions.upsertAction({
                    ...existingAction,
                    status: ActionStatus.Claimed,
                    updatedAt: Date.now(),
                    transactionMetadata: {
                      ...existingAction.transactionMetadata,
                      message: 'actionCenter.yield.unstakeClaimed',
                    },
                  }),
                )
              }
            }
          }

          // After completing an exit with an unbonding period, reuse the same action as
          // the cooldown tracker — transition from Pending directly to Initiated (green checkmark
          // + blue "Initiated" tag, same UX as Arbitrum bridge withdrawals)
          const cooldownSeconds = yieldItem?.mechanics.cooldownPeriod?.seconds
          if (action === 'exit' && cooldownSeconds && yieldItem) {
            dispatch(
              actionSlice.actions.upsertAction({
                id: yieldActionUuid,
                type: ActionType.Claim,
                status: ActionStatus.Initiated,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                transactionMetadata: {
                  displayType: GenericTransactionDisplayType.Claim,
                  txHash,
                  chainId: yieldChainId,
                  assetId: yieldItem.token.assetId as AssetId,
                  accountId,
                  message: 'actionCenter.yield.unstakeAvailableIn',
                  amountCryptoPrecision: amount,
                  cooldownExpiryTimestamp: Date.now() + cooldownSeconds * 1000,
                  yieldId: yieldItem.id,
                  contractName: yieldItem.metadata.name,
                  chainName: yieldItem.network,
                  yieldType: yieldItem.mechanics.type,
                },
              }),
            )
          }

          // Non-cooldown exits and deposits: dispatch Complete normally
          if (action !== 'manage' && !(action === 'exit' && cooldownSeconds)) {
            dispatchNotification(tx, txHash, {
              status: ActionStatus.Complete,
              id: yieldActionUuid,
            })
          }

          updateStepStatus(uiStepIndex, { status: 'success', loadingMessage: undefined })
          queryClient.removeQueries({ queryKey: ['yieldxyz', 'quote'] })
          setStep(ModalStep.Success)
        }

        if (isLastTransaction) {
          await completeLastYieldTransaction()
        } else {
          const { chainNamespace } = fromChainId(yieldChainId)
          if (chainNamespace === CHAIN_NAMESPACE.Evm) {
            const publicClient = assertGetViemClient(yieldChainId)
            await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })
          }

          const confirmedAction = await waitForTransactionConfirmation(actionId, tx.id)
          const nextTx = confirmedAction.transactions.find(
            t => t.status === TransactionStatus.Created && t.stepIndex === yieldTxIndex + 1,
          )

          if (nextTx) {
            updateStepStatus(uiStepIndex, { status: 'success', loadingMessage: undefined })
            setRawTransactions(prev => prev.map((t, i) => (i === yieldTxIndex + 1 ? nextTx : t)))
            setActiveStepIndex(uiStepIndex + 1)
          } else {
            await completeLastYieldTransaction()
          }
        }
      } catch (error) {
        console.error('Transaction execution failed:', error)
        showErrorToast(
          'yieldXYZ.errors.transactionFailedTitle',
          'yieldXYZ.errors.transactionFailedDescription',
        )
        updateStepStatus(uiStepIndex, { status: 'failed', loadingMessage: undefined })
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
      yieldItem,
      action,
      amount,
      translate,
      updateStepStatus,
      buildCosmosStakeArgs,
      submitHashMutation,
      queryClient,
      dispatchNotification,
      showErrorToast,
      dispatch,
    ],
  )

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    queryClient.removeQueries({ queryKey: ['yieldxyz', 'quote'] })
    setStep(ModalStep.InProgress)
    setTransactionSteps([])
    setRawTransactions([])
    setActiveStepIndex(-1)
    setCurrentActionId(null)
    setResetTxHash(null)
    committedAmountRef.current = ''
    onClose()
  }, [isSubmitting, onClose, queryClient])

  const handleConfirm = useCallback(async () => {
    // Handle USDT reset step if required and not yet done
    const shouldExecuteReset = isUsdtResetRequired && activeStepIndex === 0 && !resetTxHash

    if (shouldExecuteReset) {
      await executeResetAllowance()
      return
    }

    // Calculate the yield transaction index (offset by 1 if we had a reset step)
    // Use resetTxHash as indicator, not isUsdtResetRequired (which changes to false after reset)
    const hadResetStep = Boolean(resetTxHash)
    const yieldStepIndex = hadResetStep ? activeStepIndex - 1 : activeStepIndex

    // If we're in the middle of a multi-step flow, execute the next step
    if (yieldStepIndex >= 0 && rawTransactions[yieldStepIndex] && currentActionId) {
      if (bnOrZero(committedAmountRef.current).eq(amount)) {
        await executeSingleTransaction(
          rawTransactions[yieldStepIndex],
          yieldStepIndex,
          activeStepIndex,
          rawTransactions,
          currentActionId,
        )
        return
      }
      // Amount changed since these transactions were created - reset stale state
      setRawTransactions([])
      setTransactionSteps([])
      setActiveStepIndex(-1)
      setCurrentActionId(null)
      setResetTxHash(null)
      committedAmountRef.current = ''
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
      committedAmountRef.current = amount

      // Build transaction steps with reset step if needed
      const steps: TransactionStep[] = []
      if (isUsdtResetRequired) {
        steps.push({
          title: translate('yieldXYZ.resetAllowance'),
          originalTitle: 'Reset Allowance',
          type: 'RESET',
          status: 'pending',
        })
      }
      steps.push(
        ...transactions.map((tx, i) => ({
          title: formatYieldTxTitle(
            tx.title || `Transaction ${i + 1}`,
            resolveSymbolForTx(tx.type),
            yieldItem?.mechanics.type,
            tx.type,
          ),
          originalTitle: tx.title || '',
          type: tx.type,
          status: 'pending' as const,
        })),
      )

      setTransactionSteps(steps)
      setActiveStepIndex(0)

      // Execute first step (reset if required, otherwise first yield tx)
      if (isUsdtResetRequired) {
        await executeResetAllowance()
      } else {
        await executeSingleTransaction(transactions[0], 0, 0, transactions, quoteData.id)
      }
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
    isUsdtResetRequired,
    activeStepIndex,
    resetTxHash,
    currentActionId,
    rawTransactions,
    executeResetAllowance,
    executeSingleTransaction,
    yieldChainId,
    wallet,
    accountId,
    action,
    amount,
    quoteError,
    quoteData,
    resolveSymbolForTx,
    translate,
    showErrorToast,
    yieldItem?.mechanics.type,
  ])

  const isAmountLocked = useMemo(
    () => transactionSteps.some(step => Boolean(step.txHash)),
    [transactionSteps],
  )

  return useMemo(
    () => ({
      step,
      transactionSteps,
      displaySteps,
      isSubmitting,
      activeStepIndex,
      canSubmit,
      handleConfirm,
      handleClose,
      isQuoteLoading,
      quoteData,
      isAllowanceCheckPending,
      isUsdtResetRequired,
      isAmountLocked,
    }),
    [
      step,
      transactionSteps,
      displaySteps,
      isSubmitting,
      activeStepIndex,
      canSubmit,
      handleConfirm,
      handleClose,
      isQuoteLoading,
      quoteData,
      isAllowanceCheckPending,
      isUsdtResetRequired,
      isAmountLocked,
    ],
  )
}
