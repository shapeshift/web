import {
  Avatar,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Skeleton,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { cosmosChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import { FaCheck } from 'react-icons/fa'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { AccountSelector } from '@/components/AccountSelector/AccountSelector'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { enterYield, fetchAction } from '@/lib/yieldxyz/api'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
} from '@/lib/yieldxyz/constants'
import type { CosmosStakeArgs } from '@/lib/yieldxyz/executeTransaction'
import { executeTransaction } from '@/lib/yieldxyz/executeTransaction'
import type { AugmentedYieldDto, TransactionDto } from '@/lib/yieldxyz/types'
import { TransactionStatus } from '@/lib/yieldxyz/types'
import { formatYieldTxTitle, getTransactionButtonText } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { TransactionStepsList } from '@/pages/Yields/components/TransactionStepsList'
import { useConfetti } from '@/pages/Yields/hooks/useConfetti'
import type { TransactionStep } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import {
  filterExecutableTransactions,
  waitForActionCompletion,
} from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { useSubmitYieldTransactionHash } from '@/react-queries/queries/yieldxyz/useSubmitYieldTransactionHash'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type YieldEnterModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  accountNumber?: number
}

const QUOTE_DEBOUNCE_MS = 500
const PRESET_PERCENTAGES = [0.25, 0.5, 0.75, 1] as const
const SHAPESHIFT_VALIDATOR_NAME = 'ShapeShift DAO'

const INPUT_LENGTH_BREAKPOINTS = {
  FOR_XS_FONT: 22,
  FOR_SM_FONT: 14,
  FOR_MD_FONT: 10,
} as const

const getInputFontSize = (length: number): string => {
  if (length >= INPUT_LENGTH_BREAKPOINTS.FOR_XS_FONT) return '24px'
  if (length >= INPUT_LENGTH_BREAKPOINTS.FOR_SM_FONT) return '30px'
  if (length >= INPUT_LENGTH_BREAKPOINTS.FOR_MD_FONT) return '38px'
  return '48px'
}

const selectedHoverSx = { bg: 'blue.600' }
const unselectedHoverSx = { bg: 'background.surface.raised.hover' }

type CryptoAmountInputProps = {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  [key: string]: unknown
}

const CryptoAmountInput = (props: CryptoAmountInputProps) => {
  const valueLength = useMemo(() => (props.value ? String(props.value).length : 0), [props.value])
  const fontSize = useMemo(() => getInputFontSize(valueLength), [valueLength])

  return (
    <Input
      size='lg'
      fontSize={fontSize}
      lineHeight={fontSize}
      fontWeight='medium'
      textAlign='center'
      border='none'
      borderRadius='lg'
      bg='transparent'
      variant='unstyled'
      color={props.value ? 'text.base' : 'text.subtle'}
      {...props}
    />
  )
}

const YieldEnterModalSkeleton = memo(() => (
  <Flex direction='column' gap={4} align='center' py={8}>
    <Skeleton height='48px' width='200px' borderRadius='lg' />
    <Skeleton height='20px' width='100px' borderRadius='lg' />
  </Flex>
))

type ModalStep = 'input' | 'success'

export const YieldEnterModal = memo(
  ({ isOpen, onClose, yieldItem, accountNumber = 0 }: YieldEnterModalProps) => {
    const dispatch = useAppDispatch()
    const queryClient = useQueryClient()
    const toast = useToast()
    const translate = useTranslate()
    const { state: walletState, dispatch: walletDispatch } = useWallet()
    const wallet = walletState.wallet
    const isConnected = useMemo(() => Boolean(walletState.walletInfo), [walletState.walletInfo])
    const isYieldMultiAccountEnabled = useFeatureFlag('YieldMultiAccount')
    const {
      number: { localeParts },
    } = useLocaleFormatter()
    const submitHashMutation = useSubmitYieldTransactionHash()

    const [cryptoAmount, setCryptoAmount] = useState('')
    const [isFiat, setIsFiat] = useState(false)
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
    const [modalStep, setModalStep] = useState<ModalStep>('input')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([])
    const [selectedPercent, setSelectedPercent] = useState<number | null>(null)
    const [activeStepIndex, setActiveStepIndex] = useState(-1)
    const [rawTransactions, setRawTransactions] = useState<TransactionDto[]>([])
    const [currentActionId, setCurrentActionId] = useState<string | null>(null)

    const debouncedAmount = useDebounce(cryptoAmount, QUOTE_DEBOUNCE_MS)

    const { chainId } = yieldItem
    const inputToken = yieldItem.inputTokens[0]
    const inputTokenAssetId = inputToken?.assetId

    const accountIdFilter = useMemo(
      () => ({ assetId: inputTokenAssetId ?? '' }),
      [inputTokenAssetId],
    )
    const accountIds = useAppSelector(state =>
      selectPortfolioAccountIdsByAssetIdFilter(state, accountIdFilter),
    )

    const defaultAccountId = useAppSelector(state => {
      if (!chainId) return undefined
      const accountIdsByNumberAndChain = selectAccountIdByAccountNumberAndChainId(state)
      return accountIdsByNumberAndChain[accountNumber]?.[chainId]
    })

    const accountId = selectedAccountId ?? defaultAccountId
    const hasMultipleAccounts = accountIds.length > 1
    const isAccountSelectorDisabled = !isYieldMultiAccountEnabled || !hasMultipleAccounts

    const shouldFetchValidators = useMemo(
      () =>
        yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection,
      [yieldItem.mechanics.type, yieldItem.mechanics.requiresValidatorSelection],
    )
    const { data: validators, isLoading: isValidatorsLoading } = useYieldValidators(
      yieldItem.id,
      shouldFetchValidators,
    )

    const selectedValidatorAddress = useMemo(() => {
      if (chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]) {
        return DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
      }
      return validators?.[0]?.address
    }, [chainId, validators])

    const { data: providers } = useYieldProviders()

    const isStaking = yieldItem.mechanics.type === 'staking'

    const selectedValidatorMetadata = useMemo(() => {
      if (!isStaking || !selectedValidatorAddress) return null
      const found = validators?.find(v => v.address === selectedValidatorAddress)
      if (found) return found
      if (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
        return {
          name: SHAPESHIFT_VALIDATOR_NAME,
          logoURI: SHAPESHIFT_VALIDATOR_LOGO,
          address: selectedValidatorAddress,
        }
      }
      return null
    }, [isStaking, selectedValidatorAddress, validators])

    const providerMetadata = useMemo(() => {
      if (!providers) return null
      return providers[yieldItem.providerId]
    }, [providers, yieldItem.providerId])

    const userAddress = useMemo(
      () => (accountId ? fromAccountId(accountId).account : ''),
      [accountId],
    )

    const inputTokenAsset = useAppSelector(state => selectAssetById(state, inputTokenAssetId ?? ''))

    const inputTokenBalance = useAppSelector(state =>
      inputTokenAssetId && accountId
        ? selectPortfolioCryptoPrecisionBalanceByFilter(state, {
            assetId: inputTokenAssetId,
            accountId,
          })
        : '0',
    )

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId ?? ''),
    )

    const feeAsset = useAppSelector(state =>
      chainId ? selectFeeAssetByChainId(state, chainId) : undefined,
    )

    const accountMetadataFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
    const accountMetadata = useAppSelector(state =>
      selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
    )

    const minDeposit = yieldItem.mechanics?.entryLimits?.minimum

    const isBelowMinimum = useMemo(() => {
      if (!cryptoAmount || !minDeposit) return false
      return bnOrZero(cryptoAmount).lt(minDeposit)
    }, [cryptoAmount, minDeposit])

    const txArguments = useMemo(() => {
      if (!yieldItem || !userAddress || !chainId || !debouncedAmount) return null
      if (!bnOrZero(debouncedAmount).gt(0)) return null

      const fields = yieldItem.mechanics.arguments.enter.fields
      const fieldNames = new Set(fields.map(field => field.name))
      const args: Record<string, unknown> = { amount: debouncedAmount }

      if (fieldNames.has('receiverAddress')) {
        args.receiverAddress = userAddress
      }

      if (fieldNames.has('validatorAddress') && chainId) {
        args.validatorAddress =
          selectedValidatorAddress || DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
      }

      if (fieldNames.has('cosmosPubKey') && chainId === cosmosChainId) {
        args.cosmosPubKey = userAddress
      }

      return args
    }, [yieldItem, userAddress, chainId, debouncedAmount, selectedValidatorAddress])

    const {
      data: quoteData,
      isLoading: isQuoteLoading,
      isFetching: isQuoteFetching,
    } = useQuery({
      queryKey: ['yieldxyz', 'quote', 'enter', yieldItem.id, userAddress, txArguments],
      queryFn: () => {
        if (!txArguments || !userAddress || !yieldItem.id) throw new Error('Missing arguments')
        return enterYield({ yieldId: yieldItem.id, address: userAddress, arguments: txArguments })
      },
      enabled:
        !!txArguments && !!wallet && !!accountId && isOpen && bnOrZero(debouncedAmount).gt(0),
      staleTime: 30_000,
      gcTime: 60_000,
      retry: false,
    })

    const isLoading = isValidatorsLoading || !inputTokenAsset
    const isQuoteActive = isQuoteLoading || isQuoteFetching

    const fiatAmount = useMemo(
      () => bnOrZero(cryptoAmount).times(marketData?.price ?? 0),
      [cryptoAmount, marketData?.price],
    )

    const apy = useMemo(() => bnOrZero(yieldItem.rewardRate.total), [yieldItem.rewardRate.total])
    const apyDisplay = useMemo(() => `${apy.times(100).toFixed(2)}%`, [apy])

    const estimatedYearlyEarnings = useMemo(
      () => bnOrZero(cryptoAmount).times(apy),
      [cryptoAmount, apy],
    )

    const estimatedYearlyEarningsFiat = useMemo(
      () => estimatedYearlyEarnings.times(marketData?.price ?? 0),
      [estimatedYearlyEarnings, marketData?.price],
    )

    const hasAmount = bnOrZero(cryptoAmount).gt(0)

    const displayPlaceholder = useMemo(
      () => (isFiat ? `${localeParts.prefix}0` : '0'),
      [isFiat, localeParts.prefix],
    )

    const handleInputChange = useCallback(
      (values: NumberFormatValues) => {
        setSelectedPercent(null)
        if (isFiat) {
          const crypto = bnOrZero(values.value)
            .div(marketData?.price ?? 1)
            .toFixed()
          setCryptoAmount(crypto)
        } else {
          setCryptoAmount(values.value)
        }
      },
      [isFiat, marketData?.price],
    )

    const displayValue = useMemo(() => {
      if (isFiat) {
        return fiatAmount.toFixed(2)
      }
      return cryptoAmount
    }, [isFiat, fiatAmount, cryptoAmount])

    const toggleIsFiat = useCallback(() => setIsFiat(prev => !prev), [])

    const handlePercentClick = useCallback(
      (percent: number) => {
        const percentAmount = bnOrZero(inputTokenBalance).times(percent).toFixed()
        setCryptoAmount(percentAmount)
        setSelectedPercent(percent)
      },
      [inputTokenBalance],
    )

    const handleConnectWallet = useCallback(
      () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
      [walletDispatch],
    )

    const handleModalClose = useCallback(() => {
      if (isSubmitting) return
      setCryptoAmount('')
      setSelectedPercent(null)
      setIsFiat(false)
      setSelectedAccountId(undefined)
      setModalStep('input')
      setTransactionSteps([])
      setActiveStepIndex(-1)
      setRawTransactions([])
      setCurrentActionId(null)
      queryClient.removeQueries({ queryKey: ['yieldxyz', 'quote', 'enter', yieldItem.id] })
      onClose()
    }, [onClose, isSubmitting, queryClient, yieldItem.id])

    const handleAccountChange = useCallback((newAccountId: string) => {
      setSelectedAccountId(newAccountId)
      setCryptoAmount('')
      setSelectedPercent(null)
    }, [])

    const buildCosmosStakeArgs = useCallback((): CosmosStakeArgs | undefined => {
      if (chainId !== cosmosChainId) return undefined
      if (!inputTokenAsset) return undefined

      const validator =
        selectedValidatorAddress || DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[cosmosChainId]
      if (!validator) return undefined

      return {
        validator,
        amountCryptoBaseUnit: bnOrZero(cryptoAmount)
          .times(bnOrZero(10).pow(inputTokenAsset.precision))
          .toFixed(0),
        action: 'stake',
      }
    }, [chainId, selectedValidatorAddress, cryptoAmount, inputTokenAsset])

    const dispatchNotification = useCallback(
      (tx: TransactionDto, txHash: string) => {
        if (!chainId || !accountId) return
        if (!yieldItem.token.assetId) return

        const isApproval =
          tx.type?.toLowerCase() === 'approval' || tx.title?.toLowerCase().includes('approv')
        const actionType = isApproval ? ActionType.Approve : ActionType.Deposit

        dispatch(
          actionSlice.actions.upsertAction({
            id: uuidv4(),
            type: actionType,
            status: ActionStatus.Complete,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            transactionMetadata: {
              displayType: isApproval
                ? GenericTransactionDisplayType.Approve
                : GenericTransactionDisplayType.Yield,
              txHash,
              chainId,
              assetId: yieldItem.token.assetId,
              accountId,
              message: isApproval
                ? 'actionCenter.approve.approvalTxComplete'
                : 'actionCenter.deposit.complete',
              amountCryptoPrecision: cryptoAmount,
              contractName: yieldItem.metadata.name,
              chainName: yieldItem.network,
            },
          }),
        )
      },
      [dispatch, chainId, accountId, yieldItem, cryptoAmount],
    )

    const updateStepStatus = useCallback((index: number, updates: Partial<TransactionStep>) => {
      setTransactionSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
    }, [])

    const executeSingleTransaction = useCallback(
      async (
        tx: TransactionDto,
        index: number,
        allTransactions: TransactionDto[],
        actionId: string,
      ) => {
        if (!wallet || !accountId || !chainId) {
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
            chainId,
            wallet,
            accountId,
            userAddress,
            bip44Params: accountMetadata?.bip44Params,
            cosmosStakeArgs: buildCosmosStakeArgs(),
          })

          if (!txHash) throw new Error(translate('yieldXYZ.errors.broadcastFailed'))

          const txUrl = feeAsset?.explorerTxLink ? `${feeAsset.explorerTxLink}${txHash}` : ''
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
            await queryClient.refetchQueries({ queryKey: ['yieldxyz', 'allBalances'] })
            await queryClient.refetchQueries({ queryKey: ['yieldxyz', 'yields'] })

            if (chainId && SECOND_CLASS_CHAINS.includes(chainId as KnownChainIds)) {
              dispatch(
                portfolioApi.endpoints.getAccount.initiate(
                  { accountId, upsertOnFetch: true },
                  { forceRefetch: true },
                ),
              )
            }

            dispatchNotification(tx, txHash)
            updateStepStatus(index, { status: 'success', loadingMessage: undefined })
            setModalStep('success')
          } else {
            // Not last transaction - fetch fresh action to get the next tx
            const freshAction = await fetchAction(actionId)
            const nextTx = freshAction.transactions.find(
              t => t.status === TransactionStatus.Created && t.stepIndex === index + 1,
            )

            if (nextTx) {
              updateStepStatus(index, { status: 'success', loadingMessage: undefined })
              setRawTransactions(prev => prev.map((t, i) => (i === index + 1 ? nextTx : t)))
              setActiveStepIndex(index + 1)
            } else {
              // No next tx found - action might be complete
              await waitForActionCompletion(actionId)
              await queryClient.refetchQueries({ queryKey: ['yieldxyz', 'allBalances'] })
              await queryClient.refetchQueries({ queryKey: ['yieldxyz', 'yields'] })

              if (chainId && SECOND_CLASS_CHAINS.includes(chainId as KnownChainIds)) {
                dispatch(
                  portfolioApi.endpoints.getAccount.initiate(
                    { accountId, upsertOnFetch: true },
                    { forceRefetch: true },
                  ),
                )
              }

              dispatchNotification(tx, txHash)
              updateStepStatus(index, { status: 'success', loadingMessage: undefined })
              setModalStep('success')
            }
          }
        } catch (error) {
          console.error('Transaction execution failed:', error)
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
          updateStepStatus(index, { status: 'pending', loadingMessage: undefined })
        } finally {
          setIsSubmitting(false)
        }
      },
      [
        wallet,
        accountId,
        chainId,
        userAddress,
        accountMetadata?.bip44Params,
        feeAsset?.explorerTxLink,
        translate,
        updateStepStatus,
        buildCosmosStakeArgs,
        submitHashMutation,
        yieldItem.id,
        queryClient,
        dispatchNotification,
        dispatch,
        toast,
      ],
    )

    const handleExecute = useCallback(async () => {
      // If we're in the middle of a multi-step flow, execute the next step
      if (activeStepIndex >= 0 && rawTransactions[activeStepIndex] && currentActionId) {
        await executeSingleTransaction(
          rawTransactions[activeStepIndex],
          activeStepIndex,
          rawTransactions,
          currentActionId,
        )
        return
      }

      // Initial execution - set up and execute first transaction
      if (!wallet || !accountId || !chainId || !quoteData || !inputTokenAsset) return

      const transactions = filterExecutableTransactions(quoteData.transactions)

      if (transactions.length === 0) {
        setModalStep('success')
        return
      }

      setCurrentActionId(quoteData.id)
      setRawTransactions(transactions)
      setTransactionSteps(
        transactions.map((tx, i) => ({
          title: formatYieldTxTitle(
            tx.title || translate('yieldXYZ.transactionNumber', { number: i + 1 }),
            inputTokenAsset.symbol,
          ),
          originalTitle: tx.title || '',
          type: tx.type,
          status: 'pending' as const,
        })),
      )
      setActiveStepIndex(0)

      await executeSingleTransaction(transactions[0], 0, transactions, quoteData.id)
    }, [
      activeStepIndex,
      rawTransactions,
      currentActionId,
      wallet,
      accountId,
      chainId,
      quoteData,
      inputTokenAsset,
      translate,
      executeSingleTransaction,
    ])

    const enterButtonDisabled = useMemo(
      () =>
        isConnected &&
        (isLoading || !yieldItem.status.enter || !cryptoAmount || isBelowMinimum || !quoteData),
      [isConnected, isLoading, yieldItem.status.enter, cryptoAmount, isBelowMinimum, quoteData],
    )

    const enterButtonText = useMemo(() => {
      if (!isConnected) return translate('common.connectWallet')
      if (isQuoteActive) return translate('yieldXYZ.loadingQuote')

      // During execution, show the current step's action
      if (isSubmitting && transactionSteps.length > 0) {
        const activeStep = transactionSteps.find(s => s.status !== 'success')
        if (activeStep) return getTransactionButtonText(activeStep.type, activeStep.originalTitle)
      }

      // In multi-step flow (waiting for next click), use rawTransactions for current step
      if (activeStepIndex >= 0 && rawTransactions[activeStepIndex]) {
        const nextTx = rawTransactions[activeStepIndex]
        return getTransactionButtonText(nextTx.type, nextTx.title)
      }

      // Before execution, use the first CREATED transaction from quoteData
      const firstCreatedTx = quoteData?.transactions?.find(
        tx => tx.status === TransactionStatus.Created,
      )
      if (firstCreatedTx) return getTransactionButtonText(firstCreatedTx.type, firstCreatedTx.title)

      // Fallback to generic stake text
      return translate('yieldXYZ.stakeAsset', { asset: inputTokenAsset?.symbol })
    }, [
      isConnected,
      isQuoteActive,
      isSubmitting,
      transactionSteps,
      activeStepIndex,
      rawTransactions,
      quoteData,
      translate,
      inputTokenAsset?.symbol,
    ])

    const modalTitle = useMemo(() => {
      if (modalStep === 'success') return translate('common.success')
      return translate('yieldXYZ.stakeAsset', { asset: inputTokenAsset?.symbol })
    }, [translate, inputTokenAsset?.symbol, modalStep])

    const previewSteps = useMemo((): TransactionStep[] => {
      if (!quoteData?.transactions?.length || !inputTokenAsset) return []
      return quoteData.transactions
        .filter(tx => tx.status === TransactionStatus.Created)
        .map((tx, i) => ({
          title: formatYieldTxTitle(tx.title || `Transaction ${i + 1}`, inputTokenAsset.symbol),
          originalTitle: tx.title || '',
          type: tx.type,
          status: 'pending' as const,
        }))
    }, [quoteData, inputTokenAsset])

    const percentButtons = useMemo(
      () => (
        <HStack spacing={2} justify='center' width='full'>
          {PRESET_PERCENTAGES.map(percent => {
            const isSelected = selectedPercent === percent
            return (
              <Button
                key={percent}
                size='sm'
                variant='ghost'
                bg={isSelected ? 'blue.500' : 'background.surface.raised.base'}
                color={isSelected ? 'white' : 'text.subtle'}
                _hover={isSelected ? selectedHoverSx : unselectedHoverSx}
                onClick={() => handlePercentClick(percent)}
                borderRadius='full'
                px={4}
                fontWeight='medium'
              >
                {percent === 1 ? translate('modals.send.sendForm.max') : `${percent * 100}%`}
              </Button>
            )
          })}
        </HStack>
      ),
      [selectedPercent, handlePercentClick, translate],
    )

    const statsContent = useMemo(
      () => (
        <Box
          bg='background.surface.raised.base'
          borderRadius='xl'
          p={4}
          borderWidth='1px'
          borderColor='border.base'
        >
          <Flex justify='space-between' align='center'>
            <Text fontSize='sm' color='text.subtle'>
              {translate('yieldXYZ.currentApy')}
            </Text>
            <GradientApy fontSize='sm' fontWeight='bold'>
              {apyDisplay}
            </GradientApy>
          </Flex>
          {hasAmount && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.estYearlyEarnings')}
              </Text>
              <Flex direction='column' align='flex-end'>
                <GradientApy fontSize='sm' fontWeight='bold'>
                  {estimatedYearlyEarnings.decimalPlaces(4).toString()} {inputTokenAsset?.symbol}
                </GradientApy>
                <Text fontSize='xs' color='text.subtle'>
                  <Amount.Fiat value={estimatedYearlyEarningsFiat.toString()} />
                </Text>
              </Flex>
            </Flex>
          )}
          {isStaking && selectedValidatorMetadata && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.validator')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar
                  size='xs'
                  src={selectedValidatorMetadata.logoURI}
                  name={selectedValidatorMetadata.name}
                />
                <Text fontSize='sm' fontWeight='medium'>
                  {selectedValidatorMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {!isStaking && providerMetadata && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.provider')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar size='xs' src={providerMetadata.logoURI} name={providerMetadata.name} />
                <Text fontSize='sm' fontWeight='medium'>
                  {providerMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {minDeposit && bnOrZero(minDeposit).gt(0) && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.minDeposit')}
              </Text>
              <Text
                fontSize='sm'
                color={isBelowMinimum ? 'red.500' : 'text.base'}
                fontWeight='medium'
              >
                {minDeposit} {inputTokenAsset?.symbol}
              </Text>
            </Flex>
          )}
        </Box>
      ),
      [
        translate,
        apyDisplay,
        hasAmount,
        estimatedYearlyEarnings,
        inputTokenAsset?.symbol,
        estimatedYearlyEarningsFiat,
        isStaking,
        selectedValidatorMetadata,
        providerMetadata,
        minDeposit,
        isBelowMinimum,
      ],
    )

    const inputContent = useMemo(() => {
      if (isLoading) return <YieldEnterModalSkeleton />

      return (
        <Flex direction='column' align='center' py={6}>
          {inputTokenAssetId && <AssetIcon assetId={inputTokenAssetId} size='md' mb={4} />}
          <NumericFormat
            customInput={CryptoAmountInput}
            valueIsNumericString={true}
            decimalScale={isFiat ? 2 : inputTokenAsset?.precision}
            inputMode='decimal'
            thousandSeparator={localeParts.group}
            decimalSeparator={localeParts.decimal}
            allowedDecimalSeparators={allowedDecimalSeparators}
            allowNegative={false}
            allowLeadingZeros={false}
            value={displayValue}
            placeholder={displayPlaceholder}
            prefix={isFiat ? localeParts.prefix : ''}
            suffix={isFiat ? '' : ` ${inputTokenAsset?.symbol}`}
            onValueChange={handleInputChange}
          />
          <HStack spacing={2} mt={2} onClick={toggleIsFiat} cursor='pointer'>
            <Text fontSize='sm' color='text.subtle'>
              {isFiat ? (
                <Amount.Crypto value={cryptoAmount || '0'} symbol={inputTokenAsset?.symbol} />
              ) : (
                <Amount.Fiat value={fiatAmount.toFixed(2)} />
              )}
            </Text>
            <Icon as={TbSwitchVertical} fontSize='sm' color='text.subtle' />
          </HStack>
        </Flex>
      )
    }, [
      isLoading,
      inputTokenAssetId,
      isFiat,
      inputTokenAsset?.precision,
      localeParts,
      displayValue,
      displayPlaceholder,
      inputTokenAsset?.symbol,
      handleInputChange,
      toggleIsFiat,
      cryptoAmount,
      fiatAmount,
    ])

    const { getInstance, fireConfetti, confettiStyle } = useConfetti()

    useEffect(() => {
      if (modalStep === 'success') fireConfetti()
    }, [modalStep, fireConfetti])

    const successProviderInfo = useMemo(() => {
      if (isStaking && selectedValidatorMetadata) {
        return {
          name: selectedValidatorMetadata.name,
          logoURI: selectedValidatorMetadata.logoURI,
        }
      }
      if (providerMetadata) {
        return {
          name: providerMetadata.name,
          logoURI: providerMetadata.logoURI,
        }
      }
      return null
    }, [isStaking, selectedValidatorMetadata, providerMetadata])

    const successContent = useMemo(
      () => (
        <VStack spacing={6} py={4} textAlign='center' align='center'>
          <Box
            position='relative'
            w={20}
            h={20}
            borderRadius='full'
            bgGradient='linear(to-br, green.400, green.600)'
            color='white'
            display='flex'
            alignItems='center'
            justifyContent='center'
            boxShadow='0 0 30px rgba(72, 187, 120, 0.5)'
          >
            <Icon as={FaCheck} boxSize={8} />
          </Box>
          <Box>
            <Heading size='lg' mb={2}>
              {translate('yieldXYZ.success')}
            </Heading>
            <Text color='text.subtle' fontSize='md'>
              {translate('yieldXYZ.successDeposit', {
                amount: cryptoAmount,
                symbol: inputTokenAsset?.symbol,
              })}
            </Text>
          </Box>
          {successProviderInfo && (
            <Flex
              align='center'
              gap={2}
              bg='background.surface.raised.base'
              px={4}
              py={2}
              borderRadius='full'
            >
              <Avatar size='sm' src={successProviderInfo.logoURI} name={successProviderInfo.name} />
              <Text fontSize='sm' fontWeight='medium'>
                {successProviderInfo.name}
              </Text>
            </Flex>
          )}
          <Box width='full'>
            <TransactionStepsList steps={transactionSteps} />
          </Box>
        </VStack>
      ),
      [translate, cryptoAmount, inputTokenAsset?.symbol, successProviderInfo, transactionSteps],
    )

    return (
      <>
        <ReactCanvasConfetti onInit={getInstance} style={confettiStyle} />
        <Dialog isOpen={isOpen} onClose={handleModalClose} isFullScreen>
          <DialogHeader>
            <DialogHeader.Left>{null}</DialogHeader.Left>
            <DialogHeader.Middle>
              <DialogTitle>{modalTitle}</DialogTitle>
            </DialogHeader.Middle>
            <DialogHeader.Right>
              <DialogCloseButton isDisabled={isSubmitting} />
            </DialogHeader.Right>
          </DialogHeader>
          <DialogBody py={4} flex={1}>
            {modalStep === 'input' && (
              <Flex direction='column' gap={4} height='full'>
                {inputContent}
                {percentButtons}
                {inputTokenAssetId && accountId && (
                  <Flex justify='center'>
                    <AccountSelector
                      assetId={inputTokenAssetId}
                      accountId={accountId}
                      onChange={handleAccountChange}
                      disabled={isAccountSelectorDisabled}
                    />
                  </Flex>
                )}
                {statsContent}
                {activeStepIndex >= 0 ? (
                  <TransactionStepsList steps={transactionSteps} />
                ) : (
                  previewSteps.length > 0 && <TransactionStepsList steps={previewSteps} />
                )}
              </Flex>
            )}
            {modalStep === 'success' && successContent}
          </DialogBody>
          {modalStep === 'input' && (
            <DialogFooter borderTop='1px solid' borderColor='border.base' pt={4} pb={4}>
              <Button
                colorScheme='blue'
                size='lg'
                width='full'
                height='56px'
                fontSize='lg'
                fontWeight='semibold'
                borderRadius='xl'
                isDisabled={enterButtonDisabled || isSubmitting}
                isLoading={isSubmitting || (isQuoteActive && hasAmount)}
                loadingText={
                  isSubmitting ? translate('common.confirming') : translate('yieldXYZ.loadingQuote')
                }
                onClick={isConnected ? handleExecute : handleConnectWallet}
              >
                {enterButtonText}
              </Button>
            </DialogFooter>
          )}
          {modalStep === 'success' && (
            <DialogFooter borderTop='1px solid' borderColor='border.base' pt={4} pb={4}>
              <Button
                colorScheme='blue'
                size='lg'
                width='full'
                height='56px'
                fontSize='lg'
                fontWeight='semibold'
                borderRadius='xl'
                onClick={handleModalClose}
              >
                {translate('common.close')}
              </Button>
            </DialogFooter>
          )}
        </Dialog>
      </>
    )
  },
)
