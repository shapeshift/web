import { Avatar, Box, Button, Flex, HStack, Icon, Input, Skeleton, Text } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import type { ChangeEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { TbSwitchVertical } from 'react-icons/tb'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { AccountSelector } from '@/components/AccountSelector/AccountSelector'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import {
  getTransactionButtonText,
  getYieldActionLabelKeys,
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
  action: 'enter' | 'exit' | 'claim'
  validatorAddress?: string
  accountId?: AccountId
  accountNumber?: number
  onClose: () => void
  onDone?: () => void
  isSubmitting?: boolean // Optional, if handled externally or to override
}

const PRESET_PERCENTAGES = [0.25, 0.5, 0.75, 1] as const

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

type CryptoAmountInputProps = {
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
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

const YieldFormSkeleton = memo(() => (
  <Flex direction='column' gap={4} align='center' py={8}>
    <Skeleton height='48px' width='200px' borderRadius='lg' />
    <Skeleton height='20px' width='100px' borderRadius='lg' />
  </Flex>
))

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
    const claimableToken = claimableBalance?.token
    const claimableAmount = claimableBalance?.aggregatedAmount ?? '0'
    const isClaimAction = action === 'claim'

    const claimAction = useMemo(
      () => claimableBalance?.pendingActions?.find(a => a.type.toUpperCase().includes('CLAIM')),
      [claimableBalance],
    )

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
      if (validatorAddress) return validatorAddress
      if (chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]) {
        return DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
      }
      return validators?.[0]?.address
    }, [chainId, validators, validatorAddress])

    const { data: providers } = useYieldProviders()

    const isStaking = isStakingYieldType(yieldItem.mechanics.type)

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
        return fiatAmount.toFixed(2)
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
      // Clear queries?
      queryClient.removeQueries({ queryKey: ['yieldxyz', 'quote', action, yieldItem.id] })
      if (onDone) onDone()
      else onClose()
    }, [onClose, onDone, queryClient, yieldItem.id, action])

    const handleAccountChange = useCallback((newAccountId: AccountId) => {
      setSelectedAccountId(newAccountId)
      setCryptoAmount('')
      setSelectedPercent(null)
    }, [])

    // Map 'claim' -> 'manage' for useYieldTransactionFlow
    const flowAction = action === 'claim' ? 'manage' : action

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
      amount: isClaimAction ? claimableAmount : cryptoAmount,
      assetSymbol: isClaimAction ? claimableToken?.symbol ?? '' : inputTokenAsset?.symbol ?? '',
      onClose: handleFormDone,
      isOpen: true,
      validatorAddress: selectedValidatorAddress,
      accountId,
      passthrough: claimAction?.passthrough,
      manageActionType: claimAction?.type,
    })

    const isQuoteActive = isQuoteLoading || isAllowanceCheckPending

    useEffect(() => {
      if (step === ModalStep.Success) {
        // Here we could auto-close or let YieldSuccess handle it
      }
    }, [step])

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

    const buttonDisabled = useMemo(() => {
      if (!isConnected) return false
      if (isLoading) return true
      if (isClaimAction) {
        return !claimAction || !claimableAmount || bnOrZero(claimableAmount).lte(0)
      }
      return !cryptoAmount || isBelowMinimum || !quoteData
    }, [
      isConnected,
      isLoading,
      isClaimAction,
      claimAction,
      claimableAmount,
      cryptoAmount,
      isBelowMinimum,
      quoteData,
    ])

    const buttonText = useMemo(() => {
      if (!isConnected) return translate('common.connectWallet')
      if (isQuoteActive) return translate('yieldXYZ.loadingQuote')

      if (isSubmitting && transactionSteps.length > 0) {
        const activeStep = transactionSteps.find(s => s.status !== 'success')
        if (activeStep) return getTransactionButtonText(activeStep.type, activeStep.originalTitle)
      }

      if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]) {
        const currentStep = transactionSteps[activeStepIndex]
        return getTransactionButtonText(currentStep.type, currentStep.originalTitle)
      }

      if (isUsdtResetRequired) {
        return translate('yieldXYZ.resetAllowance')
      }

      const firstCreatedTx = quoteData?.transactions?.find(tx => tx.status === 'CREATED')
      if (firstCreatedTx) return getTransactionButtonText(firstCreatedTx.type, firstCreatedTx.title)

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
          {minDeposit && bnOrZero(minDeposit).gt(0) && action === 'enter' && (
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.minEnter')}
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
        action,
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
              {translate('yieldXYZ.claimableRewards')}
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
      claimableToken,
      claimableAmount,
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

    // If Success, render YieldSuccess
    if (isSuccess) {
      const successAmount = isClaimAction ? claimableAmount : cryptoAmount
      const successSymbol = isClaimAction
        ? claimableToken?.symbol ?? ''
        : inputTokenAsset?.symbol ?? ''
      const successMessageKey = isClaimAction
        ? 'successClaim'
        : action === 'exit'
        ? 'successExit'
        : 'successEnter'

      return (
        <YieldSuccess
          amount={successAmount}
          symbol={successSymbol}
          providerInfo={successProviderInfo}
          transactionSteps={transactionSteps}
          yieldId={yieldItem.id}
          accountId={accountId}
          onDone={handleFormDone}
          successMessageKey={successMessageKey}
        />
      )
    }

    return (
      <Flex direction='column' gap={4} height='100%' maxH='100%' overflow='hidden'>
        <Flex direction='column' gap={4} flex={1} overflowY='auto'>
          {inputContent}
          {!isClaimAction && percentButtons}
          {!isClaimAction && inputTokenAssetId && accountId && (
            <Flex justify='center'>
              <AccountSelector
                assetId={inputTokenAssetId}
                accountId={accountId}
                onChange={handleAccountChange}
                disabled={isAccountSelectorDisabled || isSubmitting}
              />
            </Flex>
          )}
          {!isClaimAction && statsContent}
          {!isClaimAction && (
            <YieldExplainers selectedYield={yieldItem} sellAssetSymbol={inputTokenAsset?.symbol} />
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
