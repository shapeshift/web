import { Avatar, Box, Button, Flex, HStack, Icon, Input, Skeleton, Text } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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
import { WalletActions } from '@/context/WalletProvider/actions'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { getTransactionButtonText } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { TransactionStepsList } from '@/pages/Yields/components/TransactionStepsList'
import { YieldSuccess } from '@/pages/Yields/components/YieldSuccess'
import { ModalStep, useYieldTransactionFlow } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldEnterModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  accountNumber?: number
}

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

export const YieldEnterModal = memo(
  ({ isOpen, onClose, yieldItem, accountNumber = 0 }: YieldEnterModalProps) => {
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
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
    const [selectedPercent, setSelectedPercent] = useState<number | null>(null)

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

    const minDeposit = yieldItem.mechanics?.entryLimits?.minimum

    const isBelowMinimum = useMemo(() => {
      if (!cryptoAmount || !minDeposit) return false
      return bnOrZero(cryptoAmount).lt(minDeposit)
    }, [cryptoAmount, minDeposit])

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
      setCryptoAmount('')
      setSelectedPercent(null)
      setIsFiat(false)
      setSelectedAccountId(undefined)
      queryClient.removeQueries({ queryKey: ['yieldxyz', 'quote', 'enter', yieldItem.id] })
      onClose()
    }, [onClose, queryClient, yieldItem.id])

    const handleAccountChange = useCallback((newAccountId: string) => {
      setSelectedAccountId(newAccountId)
      setCryptoAmount('')
      setSelectedPercent(null)
    }, [])

    const {
      step,
      transactionSteps,
      displaySteps,
      isSubmitting,
      activeStepIndex,
      handleConfirm,
      handleClose: hookHandleClose,
      isQuoteLoading,
      quoteData,
      isAllowanceCheckPending,
      isUsdtResetRequired,
    } = useYieldTransactionFlow({
      yieldItem,
      action: 'enter',
      amount: cryptoAmount,
      assetSymbol: inputTokenAsset?.symbol ?? '',
      onClose: handleModalClose,
      isOpen,
      validatorAddress: selectedValidatorAddress,
      accountId,
    })

    const isQuoteActive = isQuoteLoading || isAllowanceCheckPending

    useEffect(() => {
      if (step === ModalStep.Success) {
        handleModalClose()
      }
    }, [step, handleModalClose])

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

    const enterButtonDisabled = useMemo(
      () =>
        isConnected &&
        (isLoading || !yieldItem.status.enter || !cryptoAmount || isBelowMinimum || !quoteData),
      [isConnected, isLoading, yieldItem.status.enter, cryptoAmount, isBelowMinimum, quoteData],
    )

    const enterButtonText = useMemo(() => {
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

      return translate('yieldXYZ.enterAsset', { asset: inputTokenAsset?.symbol })
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
    ])

    const modalTitle = useMemo(() => {
      if (step === ModalStep.Success) return translate('common.success')
      return translate('yieldXYZ.enterAsset', { asset: inputTokenAsset?.symbol })
    }, [translate, inputTokenAsset?.symbol, step])

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

    const isInProgress = step === ModalStep.InProgress
    const isSuccess = step === ModalStep.Success

    const successContent = useMemo(
      () => (
        <YieldSuccess
          amount={cryptoAmount}
          symbol={inputTokenAsset?.symbol ?? ''}
          providerInfo={successProviderInfo}
          transactionSteps={transactionSteps}
          yieldId={yieldItem.id}
          onDone={hookHandleClose}
          successMessageKey='successEnter'
        />
      ),
      [
        cryptoAmount,
        inputTokenAsset?.symbol,
        successProviderInfo,
        transactionSteps,
        yieldItem.id,
        hookHandleClose,
      ],
    )

    const stepsToShow = activeStepIndex >= 0 ? transactionSteps : displaySteps

    const dialogOnClose = useMemo(
      () => (isSubmitting ? () => {} : hookHandleClose),
      [isSubmitting, hookHandleClose],
    )

    return (
      <Dialog isOpen={isOpen} onClose={dialogOnClose} isFullScreen>
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
          {isInProgress && (
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
              {stepsToShow.length > 0 && <TransactionStepsList steps={stepsToShow} />}
            </Flex>
          )}
          {isSuccess && successContent}
        </DialogBody>
        {isInProgress && (
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
              onClick={isConnected ? handleConfirm : handleConnectWallet}
            >
              {enterButtonText}
            </Button>
          </DialogFooter>
        )}
        {isSuccess && (
          <DialogFooter borderTop='1px solid' borderColor='border.base' pt={4} pb={4}>
            <Button
              colorScheme='blue'
              size='lg'
              width='full'
              height='56px'
              fontSize='lg'
              fontWeight='semibold'
              borderRadius='xl'
              onClick={hookHandleClose}
            >
              {translate('common.close')}
            </Button>
          </DialogFooter>
        )}
      </Dialog>
    )
  },
)
