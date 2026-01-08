import { useToast } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import { assertGetChainAdapter, isTransactionStatusAdapter } from '@/lib/utils'
import { enterYield, exitYield } from '@/lib/yieldxyz/api'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { CosmosStakeArgs } from '@/lib/yieldxyz/executeTransaction'
import { executeTransaction } from '@/lib/yieldxyz/executeTransaction'
import type { AugmentedYieldDto, TransactionDto } from '@/lib/yieldxyz/types'
import { TransactionStatus, YieldNetwork } from '@/lib/yieldxyz/types'
import { useSubmitYieldTransactionHash } from '@/react-queries/queries/yieldxyz/useSubmitYieldTransactionHash'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { selectFeeAssetByChainId, selectFirstAccountIdByChainId } from '@/state/slices/selectors'
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

const waitForTransactionConfirmation = async (
  adapter: ChainAdapter<ChainId>,
  txHash: string,
): Promise<void> => {
  const pollInterval = 5000
  const maxAttempts = 120 // 10 minutes

  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (isTransactionStatusAdapter(adapter)) {
        const status = await adapter.getTransactionStatus(txHash)
        if (status === TxStatus.Confirmed) return
        if (status === TxStatus.Failed) throw new Error('Transaction failed on-chain')
      } else {
        // Fallback or warning? For now return to avoid infinite loop on unsupported chains
        return
      }
    } catch (e) {
      // ignore fetching errors
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }
  throw new Error('Transaction confirmation timed out')
}

const formatTxTitle = (title: string, assetSymbol: string) => {
  const t = title.replace(/ transaction$/i, '').toLowerCase()
  if (t.includes('approval') || t.includes('approve') || t.includes('approved'))
    return `Approve ${assetSymbol}`
  if (t.includes('supply') || t.includes('deposit') || t.includes('enter'))
    return `Deposit ${assetSymbol}`
  if (t.includes('withdraw') || t.includes('withdrawal') || t.includes('exit'))
    return `Withdraw ${assetSymbol}`
  if (t.includes('claim')) return `Claim ${assetSymbol}`
  if (t.includes('unstake')) return `Unstake ${assetSymbol}`
  if (t.includes('stake')) return `Stake ${assetSymbol}`
  // Fallback: Sentence case
  return t.charAt(0).toUpperCase() + t.slice(1)
}

type UseYieldTransactionFlowProps = {
  yieldItem: AugmentedYieldDto
  action: 'enter' | 'exit'
  amount: string
  assetSymbol: string
  onClose: () => void
  isOpen?: boolean
  validatorAddress?: string
}

export const useYieldTransactionFlow = ({
  yieldItem,
  action,
  amount,
  assetSymbol,
  onClose,
  isOpen,
  validatorAddress,
}: UseYieldTransactionFlowProps) => {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  // State
  const [step, setStep] = useState<ModalStep>(ModalStep.InProgress)
  const [rawTransactions, setRawTransactions] = useState<TransactionDto[]>([])
  const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)

  // Mutations
  const submitHashMutation = useSubmitYieldTransactionHash()

  const { chainId: yieldChainId } = yieldItem
  const accountId = useAppSelector(state =>
    yieldChainId ? selectFirstAccountIdByChainId(state, yieldChainId) : undefined,
  )
  const feeAsset = useAppSelector(state =>
    yieldChainId ? selectFeeAssetByChainId(state, yieldChainId) : undefined,
  )
  const accountMetadata = useAppSelector(state =>
    accountId ? selectPortfolioAccountMetadataByAccountId(state, { accountId }) : undefined,
  )

  const userAddress = accountId ? fromAccountId(accountId).account : ''
  const canSubmit = Boolean(wallet && accountId && yieldChainId && bnOrZero(amount).gt(0))

  const handleClose = () => {
    if (isSubmitting) return
    setStep(ModalStep.InProgress)
    setTransactionSteps([])
    setRawTransactions([])
    setActiveStepIndex(-1)
    onClose()
  }

  // Memoize arguments creation
  const txArguments = useMemo(() => {
    if (!yieldItem || !userAddress || !amount || !yieldChainId) return null

    const fields =
      action === 'enter'
        ? yieldItem.mechanics.arguments.enter.fields
        : yieldItem.mechanics.arguments.exit.fields
    const fieldNames = new Set(fields.map(field => field.name))

    // TODO(gomes): This precision vs base unit split is likely unnecessary.
    // The yield.xyz API docs say "valid decimal number" for ALL networks, suggesting
    // they all expect precision amounts (e.g., "1.5" not "1500000").
    //
    // Current behavior:
    // - Solana, Tron, Monad, Sui → precision amount (e.g., "1.5")
    // - EVM, Cosmos → base unit (e.g., "1500000000000000000")
    //
    // If all networks use precision, simplify to:
    //   const args: Record<string, unknown> = { amount }
    //
    // Note: For Cosmos, we build the tx locally via cosmosStakeArgs anyway,
    // so the API amount might not even matter. Test with EVM yields first.
    const PRECISION_AMOUNT_NETWORKS = new Set([
      YieldNetwork.Solana,
      YieldNetwork.Tron,
      YieldNetwork.Monad,
      YieldNetwork.Sui,
    ])
    const usesPrecisionAmount = PRECISION_AMOUNT_NETWORKS.has(yieldItem.network as YieldNetwork)
    const yieldAmount = usesPrecisionAmount ? amount : toBaseUnit(amount, yieldItem.token.decimals)
    const args: Record<string, unknown> = { amount: yieldAmount }

    if (fieldNames.has('receiverAddress')) {
      args.receiverAddress = userAddress
    }

    if (fieldNames.has('validatorAddress') && yieldChainId) {
      if (validatorAddress) {
        args.validatorAddress = validatorAddress
      } else if (DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldChainId]) {
        args.validatorAddress = DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldChainId]
      }
    }

    if (fieldNames.has('cosmosPubKey') && yieldChainId === cosmosChainId) {
      args.cosmosPubKey = userAddress
    }

    return args
  }, [yieldItem, action, amount, userAddress, yieldChainId, validatorAddress])

  // Prefetch Quote using useQuery
  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ['yieldxyz', 'quote', action, yieldItem.id, userAddress, txArguments],
    queryFn: async () => {
      if (!txArguments || !userAddress || !yieldItem.id) throw new Error('Missing arguments')
      // Note: We're using the API functions directly here instead of hooks
      // because we want standard query behavior (caching, etc.)
      const fn = action === 'enter' ? enterYield : exitYield
      return await fn(yieldItem.id, userAddress, txArguments)
    },
    // Only fetch if we have valid arguments and wallet is connected
    enabled: !!txArguments && !!wallet && !!accountId && canSubmit && isOpen,
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  })

  const filterExecutableTransactions = (transactions: TransactionDto[]): TransactionDto[] =>
    transactions.filter(tx => tx.status === TransactionStatus.Created)

  const executeSingleTransaction = async (
    tx: TransactionDto,
    index: number,
    allTransactions: TransactionDto[],
  ) => {
    if (!wallet || !accountId) {
      throw new Error(translate('yieldXYZ.errors.walletNotConnected'))
    }
    if (!yieldChainId) {
      throw new Error(translate('yieldXYZ.errors.unsupportedYieldNetwork'))
    }

    const adapter = assertGetChainAdapter(yieldChainId as KnownChainIds)

    // Update step status to loading
    setTransactionSteps(prev =>
      prev.map((s, idx) =>
        idx === index
          ? { ...s, status: 'loading', loadingMessage: translate('yieldXYZ.loading.signInWallet') }
          : s,
      ),
    )
    setIsSubmitting(true)

    const cosmosStakeArgs: CosmosStakeArgs | undefined =
      yieldChainId === cosmosChainId
        ? {
            validator:
              validatorAddress || (DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[cosmosChainId] ?? ''),
            amountCryptoBaseUnit: bnOrZero(amount)
              .times(bnOrZero(10).pow(yieldItem.token.decimals))
              .toFixed(0),
            action: action === 'enter' ? 'stake' : 'unstake',
          }
        : undefined

    try {
      const txHash = await executeTransaction({
        tx,
        chainId: yieldChainId,
        wallet,
        accountId,
        userAddress,
        bip44Params: accountMetadata?.bip44Params,
        cosmosStakeArgs,
      })

      if (!txHash) throw new Error(translate('yieldXYZ.errors.broadcastFailed'))

      // Get Explorer URL
      const txUrl = feeAsset ? `${feeAsset.explorerTxLink}${txHash}` : ''

      // Show "Confirming..." state
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index ? { ...s, txHash, txUrl, loadingMessage: 'Confirming...' } : s,
        ),
      )

      // Wait for confirmation
      await waitForTransactionConfirmation(adapter as ChainAdapter<ChainId>, txHash)

      // 4. Submit Hash
      await submitHashMutation.mutateAsync({
        transactionId: tx.id,
        hash: txHash,
        yieldId: yieldItem.id,
        address: userAddress,
      })

      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'balances'] })
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })

      // Dispatch Action for Notification Center
      const isApproval = tx.title && tx.title.toLowerCase().includes('approv')
      const actionType = isApproval
        ? ActionType.Approve
        : action === 'enter'
        ? ActionType.Deposit
        : ActionType.Withdraw
      const displayType = isApproval
        ? GenericTransactionDisplayType.Approve
        : GenericTransactionDisplayType.Yield

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
            message: formatTxTitle(tx.title || 'Transaction', assetSymbol),
            amountCryptoPrecision: amount,
          },
        }),
      )

      // Update step status to success
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index ? { ...s, status: 'success', txHash, txUrl, loadingMessage: undefined } : s,
        ),
      )

      // Check if next step exists
      if (index + 1 < allTransactions.length) {
        setActiveStepIndex(index + 1)
        setIsSubmitting(false) // Stop submitting to allow user to click next button
      } else {
        setStep(ModalStep.Success)
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Transaction execution failed:', error)
      toast({
        title: translate('yieldXYZ.errors.transactionFailedTitle'),
        description: translate('yieldXYZ.errors.transactionFailedDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setIsSubmitting(false)
      // Reset step status pending so user can retry
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index ? { ...s, status: 'pending', loadingMessage: undefined } : s,
        ),
      )
    }
  }

  const handleConfirm = async () => {
    // Continue existing sequence
    if (activeStepIndex >= 0 && rawTransactions[activeStepIndex]) {
      await executeSingleTransaction(
        rawTransactions[activeStepIndex],
        activeStepIndex,
        rawTransactions,
      )
      return
    }

    // Initial Start
    if (!yieldChainId) {
      toast({
        title: translate('yieldXYZ.errors.unsupportedNetworkTitle'),
        description: translate('yieldXYZ.errors.unsupportedNetworkDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    if (!wallet || !accountId) {
      toast({
        title: translate('yieldXYZ.errors.walletNotConnectedTitle'),
        description: translate('yieldXYZ.errors.walletNotConnectedDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    if (!bnOrZero(amount).gt(0)) {
      toast({
        title: translate('yieldXYZ.errors.enterAmountTitle'),
        description: translate('yieldXYZ.errors.enterAmountDescription'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      return
    }

    if (quoteError) {
      toast({
        title: translate('yieldXYZ.errors.quoteFailedTitle'),
        description: translate('yieldXYZ.errors.quoteFailedDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    if (!quoteData) {
      // Should not happen if button is enabled only when !isQuoteLoading
      return
    }

    setIsSubmitting(true)

    // Show generic loading state immediately
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

      setRawTransactions(transactions)
      setTransactionSteps(
        transactions.map((tx, i) => ({
          title: formatTxTitle(tx.title || `Transaction ${i + 1}`, assetSymbol),
          originalTitle: tx.title || '',
          status: 'pending',
        })),
      )

      setActiveStepIndex(0)
      // Execute the first transaction immediately
      await executeSingleTransaction(transactions[0], 0, transactions)
    } catch (error) {
      console.error('Failed to initiate action:', error)
      toast({
        title: translate('yieldXYZ.errors.initiateFailedTitle'),
        description: translate('yieldXYZ.errors.initiateFailedDescription'),
        status: 'error',
        duration: 5000,
      })
      setIsSubmitting(false)
      setTransactionSteps([])
    }
  }

  return {
    step,
    transactionSteps,
    isSubmitting,
    activeStepIndex,
    canSubmit,
    handleConfirm,
    handleClose,
    isQuoteLoading,
  }
}
