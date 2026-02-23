import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import dayjsDuration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { AccountSelector } from '@/components/AccountSelector/AccountSelector'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CryptoAmountInput } from '@/components/CryptoAmountInput/CryptoAmountInput'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import {
  getDefaultValidatorForYield,
  getTransactionButtonText,
  getYieldActionLabelKeys,
  getYieldMinAmountKey,
  getYieldSuccessMessageKey,
  isStakingYieldType,
} from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { TransactionStepsList } from '@/pages/Yields/components/TransactionStepsList'
import { YieldExplainers } from '@/pages/Yields/components/YieldExplainers'
import { YieldSuccess } from '@/pages/Yields/components/YieldSuccess'
import { ModalStep, useYieldTransactionFlow } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import type { NormalizedYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldFormProps = {
  yieldItem: AugmentedYieldDto
  balances?: NormalizedYieldBalances
  action: 'enter' | 'exit' | 'claim' | 'withdraw'
  validatorAddress?: string
  accountId?: AccountId
  accountNumber?: number
  pendingActionIndex?: number
  onClose: () => void
  onDone?: () => void
  isSubmitting?: boolean // Optional, if handled externally or to override
}

const PRESET_PERCENTAGES = [0.25, 0.5, 0.75, 1] as const

const YieldFormSkeleton = memo(() => (
  <Flex direction='column' gap={4} align='center' py={8}>
    <Skeleton height='48px' width='200px' borderRadius='lg' />
    <Skeleton height='20px' width='100px' borderRadius='lg' />
  </Flex>
))

dayjs.extend(dayjsDuration)
dayjs.extend(relativeTime)

const selectedHoverSx = { bg: 'blue.600' }
const unselectedHoverSx = { bg: 'background.surface.raised.hover' }

export const YieldForm = memo(
  ({
    yieldItem,
    balances,
    action,
    validatorAddress,
    accountId: accountIdProp,
    accountNumber,
    pendingActionIndex,
    onClose,
    onDone,
  }: YieldFormProps) => {
    const queryClient = useQueryClient()
    const translate = useTranslate()
    const { state: walletState, dispatch: walletDispatch } = useWallet()
    const isConnected = useMemo(() => Boolean(walletState.walletInfo), [walletState.walletInfo])
    const isYieldMultiAccountEnabled = useFeatureFlag('YieldMultiAccount')
    const {
      number: { localeParts },
    } = useLocaleFormatter()

    const [cryptoAmount, setCryptoAmount] = useState('')
    const [isFiat, setIsFiat] = useState(false)
    const [selectedAccountId, setSelectedAccountId] = useState<AccountId | undefined>(accountIdProp)
    const [selectedPercent, setSelectedPercent] = useState<number | null>(null)

    const { chainId } = yieldItem
    const inputToken = yieldItem.inputTokens[0]
    const inputTokenAssetId = inputToken?.assetId

    const claimableBalance = useMemo(() => balances?.byType[YieldBalanceType.Claimable], [balances])
    const withdrawableBalance = useMemo(
      () => balances?.byType[YieldBalanceType.Withdrawable],
      [balances],
    )
    const isClaimAction = action === 'claim'

    const claimableClaimAction = useMemo(
      () => claimableBalance?.pendingActions?.find(a => a.type.toUpperCase().includes('CLAIM')),
      [claimableBalance],
    )

    const claimAction = useMemo(
      () =>
        claimableClaimAction ??
        withdrawableBalance?.pendingActions?.find(a => a.type.toUpperCase().includes('CLAIM')),
      [claimableClaimAction, withdrawableBalance],
    )

    const isWithdrawableClaim = !claimableClaimAction && Boolean(claimAction)

    const effectiveClaimBalance = useMemo(() => {
      if (isWithdrawableClaim) return withdrawableBalance

      const hasClaimableAmount = !bnOrZero(claimableBalance?.aggregatedAmount).isZero()
      if (hasClaimableAmount) return claimableBalance

      return withdrawableBalance
    }, [isWithdrawableClaim, claimableBalance, withdrawableBalance])

    const claimableToken = effectiveClaimBalance?.token
    const claimableAmount = effectiveClaimBalance?.aggregatedAmount ?? '0'

    const withdrawableToken = withdrawableBalance?.token
    const isWithdrawAction = action === 'withdraw'

    const withdrawActions = useMemo(
      () =>
        withdrawableBalance?.pendingActions?.filter(a =>
          a.type.toUpperCase().includes('WITHDRAW'),
        ) ?? [],
      [withdrawableBalance],
    )

    const withdrawAction = useMemo(() => {
      if (pendingActionIndex !== undefined) return withdrawActions[pendingActionIndex]
      return withdrawActions[0]
    }, [withdrawActions, pendingActionIndex])

    const withdrawableAmountFromPassthrough = useMemo(() => {
      if (!withdrawAction?.passthrough) return withdrawableBalance?.aggregatedAmount ?? '0'
      try {
        const decoded = JSON.parse(atob(withdrawAction.passthrough))
        return decoded?.args?.amount ?? withdrawableBalance?.aggregatedAmount ?? '0'
      } catch (e) {
        console.error('Failed to decode withdraw passthrough', e)
        return withdrawableBalance?.aggregatedAmount ?? '0'
      }
    }, [withdrawAction?.passthrough, withdrawableBalance?.aggregatedAmount])

    const withdrawableAmountRef = useRef(withdrawableAmountFromPassthrough)

    const isManageAction = isClaimAction || isWithdrawAction

    const accountIdFilter = useMemo(
      () => ({ assetId: inputTokenAssetId ?? '' }),
      [inputTokenAssetId],
    )
    const accountIds = useAppSelector(state =>
      selectPortfolioAccountIdsByAssetIdFilter(state, accountIdFilter),
    )

    const derivedAccountNumber = useAppSelector(state => {
      if (accountNumber !== undefined) return accountNumber
      if (accountIdProp)
        return selectAccountNumberByAccountId(state, { accountId: accountIdProp }) ?? 0
      return 0
    })

    const defaultAccountId = useAppSelector(state => {
      if (accountIdProp) return accountIdProp
      if (!chainId) return undefined
      const accountIdsByNumberAndChain = selectAccountIdByAccountNumberAndChainId(state)
      return accountIdsByNumberAndChain[derivedAccountNumber]?.[chainId]
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
      if (!shouldFetchValidators) return undefined
      if (validatorAddress) return validatorAddress
      const defaultValidator = getDefaultValidatorForYield(yieldItem.id)
      if (defaultValidator) return defaultValidator
      return validators?.[0]?.address
    }, [shouldFetchValidators, validators, validatorAddress, yieldItem.id])

    const { data: providers } = useYieldProviders()

    const isStaking = isStakingYieldType(yieldItem.mechanics.type)

    const maybeSelectedValidatorMetadata = useMemo(() => {
      if (!shouldFetchValidators || !selectedValidatorAddress) return null
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
    }, [shouldFetchValidators, selectedValidatorAddress, validators])

    const maybeProviderMetadata = useMemo(() => {
      if (!providers) return null
      return providers[yieldItem.providerId]
    }, [providers, yieldItem.providerId])

    const inputTokenAsset = useAppSelector(state => selectAssetById(state, inputTokenAssetId ?? ''))

    const inputTokenBalance = useAppSelector(state =>
      inputTokenAssetId && accountId
        ? selectPortfolioCryptoPrecisionBalanceByFilter(state, {
            assetId: inputTokenAssetId,
            accountId,
          })
        : '0',
    )

    // Calculate maximum available balance for the action
    // If Enter: Wallet Balance
    // If Exit: Staked Balance (filtered by validator if applicable)
    // If Claim: Not really relevant for amount input usually, but if so, claimable amount
    const availableBalance = useMemo(() => {
      if (action === 'enter') return inputTokenBalance

      if (action === 'exit' && balances) {
        if (isStaking && selectedValidatorAddress) {
          // Find specific validator entered balance
          const validatorBalance = balances.raw.find(
            b =>
              b.validator?.address === selectedValidatorAddress &&
              b.type === YieldBalanceType.Active,
          )
          return validatorBalance?.amount ?? '0'
        }
        // Otherwise use total active balance
        return balances.byType[YieldBalanceType.Active]?.aggregatedAmount ?? '0'
      }

      return '0' // default fallback
    }, [action, inputTokenBalance, balances, isStaking, selectedValidatorAddress])

    // Proceeding with inputTokenBalance for now to match YieldEnterModal logic structure, but aware this is a nuance for Exit.

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId ?? ''),
    )

    const minDeposit = yieldItem.mechanics?.entryLimits?.minimum

    const isBelowMinimum = useMemo(() => {
      if (!cryptoAmount) return false
      if (action === 'enter' && minDeposit) {
        return bnOrZero(cryptoAmount).lt(minDeposit)
      }
      if (action === 'exit') {
        // For exit, maybe ensure they don't exit more than they have?
        // Though the transaction flow usually simulates and fails.
        // But UI check is nice.
        return bnOrZero(cryptoAmount).gt(availableBalance)
      }
      return false
    }, [cryptoAmount, minDeposit, action, availableBalance])

    const isLoading = isValidatorsLoading || !inputTokenAsset

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
            .div(marketData?.price || 1)
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
        return fiatAmount.isZero() ? '' : fiatAmount.toFixed(2)
      }
      return cryptoAmount
    }, [isFiat, fiatAmount, cryptoAmount])

    const toggleIsFiat = useCallback(() => setIsFiat(prev => !prev), [])

    const handlePercentClick = useCallback(
      (percent: number) => {
        const percentAmount = bnOrZero(availableBalance).times(percent).toFixed()
        setCryptoAmount(percentAmount)
        setSelectedPercent(percent)
      },
      [availableBalance],
    )

    const handleConnectWallet = useCallback(
      () => walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
      [walletDispatch],
    )

    const handleFormDone = useCallback(() => {
      setCryptoAmount('')
      setSelectedPercent(null)
      setIsFiat(false)
      setSelectedAccountId(undefined)
      queryClient.removeQueries({ queryKey: ['yieldxyz', 'quote', action, yieldItem.id] })
      queryClient.removeQueries({ queryKey: ['yieldxyz', 'allBalances'] })
      if (onDone) onDone()
      else onClose()
    }, [onClose, onDone, queryClient, yieldItem.id, action])

    const handleAccountChange = useCallback((newAccountId: AccountId) => {
      setSelectedAccountId(newAccountId)
      setCryptoAmount('')
      setSelectedPercent(null)
    }, [])

    const activeManageAction = useMemo(() => {
      if (isClaimAction) return claimAction
      if (isWithdrawAction) return withdrawAction
      return undefined
    }, [isClaimAction, claimAction, isWithdrawAction, withdrawAction])

    const activeManageAmount = useMemo(() => {
      if (isClaimAction) return claimableAmount
      if (isWithdrawAction) return withdrawableAmountFromPassthrough
      return cryptoAmount
    }, [
      isClaimAction,
      claimableAmount,
      isWithdrawAction,
      withdrawableAmountFromPassthrough,
      cryptoAmount,
    ])

    const activeManageSymbol = useMemo(() => {
      if (isClaimAction) return claimableToken?.symbol ?? ''
      if (isWithdrawAction) return withdrawableToken?.symbol ?? ''
      return inputTokenAsset?.symbol ?? ''
    }, [
      isClaimAction,
      claimableToken?.symbol,
      isWithdrawAction,
      withdrawableToken?.symbol,
      inputTokenAsset?.symbol,
    ])

    const flowAction = isManageAction ? 'manage' : action

    const {
      step,
      transactionSteps,
      displaySteps,
      isSubmitting,
      activeStepIndex,
      handleConfirm,
      isQuoteLoading,
      quoteData,
      isAllowanceCheckPending,
      isUsdtResetRequired,
    } = useYieldTransactionFlow({
      yieldItem,
      action: flowAction,
      amount: activeManageAmount,
      assetSymbol: activeManageSymbol,
      onClose: handleFormDone,
      isOpen: true,
      validatorAddress: selectedValidatorAddress,
      accountId,
      passthrough: activeManageAction?.passthrough,
      manageActionType: activeManageAction?.type,
    })

    if (!isSubmitting && step !== ModalStep.Success) {
      withdrawableAmountRef.current = withdrawableAmountFromPassthrough
    }
    const withdrawableAmount = withdrawableAmountRef.current

    const isQuoteActive = isQuoteLoading || isAllowanceCheckPending

    const maybeSuccessProviderInfo = useMemo(() => {
      if (isStaking && maybeSelectedValidatorMetadata) {
        return {
          name: maybeSelectedValidatorMetadata.name,
          logoURI: maybeSelectedValidatorMetadata.logoURI,
        }
      }
      if (maybeProviderMetadata) {
        return {
          name: maybeProviderMetadata.name,
          logoURI: maybeProviderMetadata.logoURI,
        }
      }
      return null
    }, [isStaking, maybeSelectedValidatorMetadata, maybeProviderMetadata])

    const isActionDisabled = useMemo(() => {
      if (action === 'enter') return !yieldItem.status.enter
      if (action === 'exit') return !yieldItem.status.exit
      return false
    }, [action, yieldItem.status.enter, yieldItem.status.exit])

    const buttonDisabled = useMemo(() => {
      if (!isConnected) return false
      if (isLoading) return true
      if (isActionDisabled) return true
      if (isClaimAction) {
        return !claimAction || !claimableAmount || bnOrZero(claimableAmount).lte(0)
      }
      if (isWithdrawAction) {
        return (
          !withdrawAction ||
          !withdrawableAmountFromPassthrough ||
          bnOrZero(withdrawableAmountFromPassthrough).lte(0)
        )
      }
      return !cryptoAmount || isBelowMinimum || !quoteData
    }, [
      isConnected,
      isLoading,
      isActionDisabled,
      isClaimAction,
      claimAction,
      claimableAmount,
      isWithdrawAction,
      withdrawAction,
      withdrawableAmountFromPassthrough,
      cryptoAmount,
      isBelowMinimum,
      quoteData,
    ])

    const buttonText = useMemo(() => {
      if (!isConnected) return translate('common.connectWallet')
      if (isQuoteActive) return translate('yieldXYZ.loadingQuote')

      if (isSubmitting && transactionSteps.length > 0) {
        const activeStep = transactionSteps.find(s => s.status !== 'success')
        if (activeStep)
          return getTransactionButtonText(
            activeStep.type,
            activeStep.originalTitle,
            yieldItem.mechanics.type,
          )
      }

      if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]) {
        const currentStep = transactionSteps[activeStepIndex]
        return getTransactionButtonText(
          currentStep.type,
          currentStep.originalTitle,
          yieldItem.mechanics.type,
        )
      }

      if (isUsdtResetRequired) {
        return translate('yieldXYZ.resetAllowance')
      }

      const firstCreatedTx = quoteData?.transactions?.find(tx => tx.status === 'CREATED')
      if (firstCreatedTx)
        return getTransactionButtonText(
          firstCreatedTx.type,
          firstCreatedTx.title,
          yieldItem.mechanics.type,
        )

      const actionLabelKeys = getYieldActionLabelKeys(yieldItem.mechanics.type)
      if (action === 'enter') {
        return `${translate(actionLabelKeys.enter)} ${inputTokenAsset?.symbol ?? ''}`
      }
      if (action === 'exit') {
        return `${translate(actionLabelKeys.exit)} ${inputTokenAsset?.symbol ?? ''}`
      }
      if (action === 'claim') {
        return `${translate('common.claim')} ${claimableToken?.symbol ?? ''}`
      }
      if (action === 'withdraw') {
        return `${translate('common.withdraw')} ${withdrawableToken?.symbol ?? ''}`
      }
      return translate('common.continue')
    }, [
      isConnected,
      isQuoteActive,
      isSubmitting,
      transactionSteps,
      activeStepIndex,
      isUsdtResetRequired,
      quoteData,
      translate,
      inputTokenAsset?.symbol,
      action,
      yieldItem.mechanics.type,
      claimableToken?.symbol,
      withdrawableToken?.symbol,
    ])

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
        <VStack
          spacing={3}
          align='stretch'
          bg='background.surface.raised.base'
          borderRadius='xl'
          p={4}
          borderWidth='1px'
          borderColor='border.base'
        >
          {action === 'enter' && (
            <Flex justify='space-between' align='center'>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.currentApy')}
              </Text>
              <GradientApy fontSize='sm' fontWeight='bold'>
                {apyDisplay}
              </GradientApy>
            </Flex>
          )}
          {action === 'enter' && hasAmount && (
            <Flex justify='space-between' align='center'>
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
          {isStaking && maybeSelectedValidatorMetadata && (
            <Flex justify='space-between' align='center'>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.validator')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar
                  size='xs'
                  src={maybeSelectedValidatorMetadata.logoURI}
                  name={maybeSelectedValidatorMetadata.name}
                />
                <Text fontSize='sm' fontWeight='medium'>
                  {maybeSelectedValidatorMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {(!isStaking || !maybeSelectedValidatorMetadata) && maybeProviderMetadata && (
            <Flex justify='space-between' align='center'>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.provider')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar
                  size='xs'
                  src={maybeProviderMetadata.logoURI}
                  name={maybeProviderMetadata.name}
                />
                <Text fontSize='sm' fontWeight='medium'>
                  {maybeProviderMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {minDeposit && bnOrZero(minDeposit).gt(0) && action === 'enter' && (
            <Flex justify='space-between' align='center'>
              <Text fontSize='sm' color='text.subtle'>
                {translate(getYieldMinAmountKey(yieldItem.mechanics.type))}
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
        </VStack>
      ),
      [
        translate,
        apyDisplay,
        hasAmount,
        estimatedYearlyEarnings,
        inputTokenAsset?.symbol,
        estimatedYearlyEarningsFiat,
        isStaking,
        maybeSelectedValidatorMetadata,
        maybeProviderMetadata,
        minDeposit,
        isBelowMinimum,
        action,
        yieldItem.mechanics.type,
      ],
    )

    const inputContent = useMemo(() => {
      if (isLoading) return <YieldFormSkeleton />

      if (isClaimAction && claimableToken) {
        return (
          <Flex direction='column' align='center' py={6}>
            <Avatar src={claimableToken.logoURI} name={claimableToken.symbol} size='md' mb={4} />
            <Text fontSize='3xl' fontWeight='bold' lineHeight='1'>
              <Amount.Crypto value={claimableAmount} symbol={claimableToken.symbol} />
            </Text>
            <Text fontSize='sm' color='text.subtle' mt={2}>
              {translate(
                isWithdrawableClaim ? 'yieldXYZ.readyToClaim' : 'yieldXYZ.claimableRewards',
              )}
            </Text>
          </Flex>
        )
      }

      if (isWithdrawAction && withdrawableToken) {
        return (
          <Flex direction='column' align='center' py={6}>
            <Avatar
              src={withdrawableToken.logoURI}
              name={withdrawableToken.symbol}
              size='md'
              mb={4}
            />
            <Text fontSize='3xl' fontWeight='bold' lineHeight='1'>
              <Amount.Crypto value={withdrawableAmount} symbol={withdrawableToken.symbol} />
            </Text>
            <Text fontSize='sm' color='text.subtle' mt={2}>
              {translate('yieldXYZ.withdrawableFunds')}
            </Text>
          </Flex>
        )
      }

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
          <HStack
            spacing={2}
            mt={2}
            onClick={toggleIsFiat}
            cursor='pointer'
            role='button'
            tabIndex={0}
            aria-label={translate('trade.switchCurrency')}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleIsFiat()
              }
            }}
          >
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
      isClaimAction,
      isWithdrawableClaim,
      claimableToken,
      claimableAmount,
      isWithdrawAction,
      withdrawableToken,
      withdrawableAmount,
      translate,
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

    const isSuccess = step === ModalStep.Success

    const stepsToShow = activeStepIndex >= 0 ? transactionSteps : displaySteps

    const maybeActionDisabledAlert = useMemo(() => {
      if (!isActionDisabled) return null
      const descriptionKey =
        action === 'enter'
          ? 'yieldXYZ.depositsDisabledDescription'
          : 'yieldXYZ.withdrawalsDisabledDescription'
      return (
        <Alert status='warning' borderRadius='lg'>
          <AlertIcon />
          <AlertDescription>{translate(descriptionKey)}</AlertDescription>
        </Alert>
      )
    }, [isActionDisabled, action, translate])

    // If Success, render YieldSuccess
    if (isSuccess) {
      const successAmount = (() => {
        if (isWithdrawAction) return withdrawableAmount
        if (isClaimAction) return claimableAmount
        return cryptoAmount
      })()
      const successMessageKey = getYieldSuccessMessageKey(yieldItem.mechanics.type, action)
      const cooldownSeconds = yieldItem.mechanics.cooldownPeriod?.seconds
      const cooldownMessage =
        action === 'exit' && cooldownSeconds
          ? translate('yieldXYZ.cooldownNotice', {
              cooldownDuration: dayjs.duration(cooldownSeconds, 'seconds').humanize(),
            })
          : undefined

      return (
        <YieldSuccess
          amount={successAmount}
          symbol={activeManageSymbol}
          providerInfo={maybeSuccessProviderInfo}
          transactionSteps={transactionSteps}
          yieldId={yieldItem.id}
          accountId={accountId}
          onDone={handleFormDone}
          successMessageKey={successMessageKey}
          cooldownMessage={cooldownMessage}
        />
      )
    }

    return (
      <Flex direction='column' gap={4} height='100%' maxH='100%' overflow='hidden'>
        <Flex direction='column' gap={4} flex={1} overflowY='auto'>
          {maybeActionDisabledAlert}
          {inputContent}
          {!isManageAction && percentButtons}
          {!isManageAction && inputTokenAssetId && accountId && (
            <Flex justify='center'>
              <AccountSelector
                assetId={inputTokenAssetId}
                accountId={accountId}
                onChange={handleAccountChange}
                disabled={isAccountSelectorDisabled || isSubmitting}
                cryptoBalanceOverride={action === 'exit' ? availableBalance : undefined}
              />
            </Flex>
          )}
          {!isManageAction && statsContent}
          {!isManageAction && (
            <YieldExplainers
              selectedYield={yieldItem}
              sellAssetSymbol={inputTokenAsset?.symbol}
              action={action}
            />
          )}
          {stepsToShow.length > 0 && <TransactionStepsList steps={stepsToShow} />}
        </Flex>

        <Box pt={4} pb={4}>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            height='56px'
            fontSize='lg'
            fontWeight='semibold'
            borderRadius='xl'
            isDisabled={buttonDisabled || isSubmitting}
            isLoading={isSubmitting || (isQuoteActive && hasAmount)}
            loadingText={
              isSubmitting ? translate('common.confirming') : translate('yieldXYZ.loadingQuote')
            }
            onClick={isConnected ? handleConfirm : handleConnectWallet}
          >
            {buttonText}
          </Button>
        </Box>
      </Flex>
    )
  },
)
