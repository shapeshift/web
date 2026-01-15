import { Avatar, Box, Button, Flex, HStack, Skeleton, Text, VStack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { EarnRoutePaths } from './types'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { getTransactionButtonText } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { TransactionStepsList } from '@/pages/Yields/components/TransactionStepsList'
import { YieldAssetFlow } from '@/pages/Yields/components/YieldAssetFlow'
import { YieldSuccess } from '@/pages/Yields/components/YieldSuccess'
import { ModalStep, useYieldTransactionFlow } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectMarketDataByFilter,
} from '@/state/slices/selectors'
import {
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectSelectedYieldId,
  selectSellAccountId,
} from '@/state/slices/tradeEarnInputSlice/selectors'
import { useAppSelector } from '@/state/store'

const defaultYieldItem = {} as AugmentedYieldDto

export const EarnConfirm = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const sellAsset = useAppSelector(selectInputSellAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const selectedYieldId = useAppSelector(selectSelectedYieldId)
  const sellAccountId = useAppSelector(selectSellAccountId)

  const { data: yieldsData, isLoading: isLoadingYields } = useYields()

  const selectedYield = useMemo(() => {
    if (!selectedYieldId || !yieldsData?.byId) return undefined
    return yieldsData.byId[selectedYieldId]
  }, [selectedYieldId, yieldsData?.byId])

  const hasValidState = Boolean(
    selectedYieldId && sellAmountCryptoPrecision && bnOrZero(sellAmountCryptoPrecision).gt(0),
  )

  useEffect(() => {
    if (!isLoadingYields && !hasValidState) {
      navigate(EarnRoutePaths.Input, { replace: true })
    }
  }, [isLoadingYields, hasValidState, navigate])

  // Fallback to account 0 if no account selected
  const yieldChainId = selectedYield?.chainId
  const fallbackAccountId = useAppSelector(state => {
    if (sellAccountId) return undefined
    if (!yieldChainId) return undefined
    return selectAccountIdByAccountNumberAndChainId(state)[0]?.[yieldChainId]
  })
  const accountIdToUse = sellAccountId ?? fallbackAccountId

  const requiresValidatorSelection = selectedYield?.mechanics.requiresValidatorSelection ?? false

  const { data: validators } = useYieldValidators(selectedYieldId ?? '', requiresValidatorSelection)
  const { data: providers } = useYieldProviders()

  const selectedValidatorAddress = useMemo(() => {
    if (!requiresValidatorSelection || !validators?.length) return undefined
    const chainId = selectedYield?.chainId
    const defaultAddress = chainId ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId] : undefined
    if (defaultAddress) {
      const defaultValidator = validators.find(v => v.address === defaultAddress)
      if (defaultValidator) return defaultValidator.address
    }
    const preferred = validators.find(v => v.preferred)
    return preferred?.address ?? validators[0]?.address
  }, [requiresValidatorSelection, validators, selectedYield?.chainId])

  const selectedValidator = useMemo(() => {
    if (!selectedValidatorAddress || !validators?.length) return undefined
    return validators.find(v => v.address === selectedValidatorAddress)
  }, [selectedValidatorAddress, validators])

  const sellAssetFromState = useAppSelector(state =>
    selectAssetById(state, sellAsset?.assetId ?? ''),
  )

  const { price: sellAssetUserCurrencyRate } =
    useAppSelector(state => selectMarketDataByFilter(state, { assetId: sellAsset?.assetId })) || {}

  const sellAmountUserCurrency = useMemo(() => {
    if (!sellAmountCryptoPrecision || !sellAssetUserCurrencyRate) return undefined
    return bnOrZero(sellAmountCryptoPrecision).times(sellAssetUserCurrencyRate).toString()
  }, [sellAmountCryptoPrecision, sellAssetUserCurrencyRate])

  const handleBack = useCallback(() => navigate(EarnRoutePaths.Input), [navigate])
  const handleClose = useCallback(() => navigate(EarnRoutePaths.Input), [navigate])

  const apy = useMemo(
    () => (selectedYield ? (selectedYield.rewardRate?.total ?? 0) * 100 : 0),
    [selectedYield],
  )

  const estimatedYearlyEarnings = useMemo(() => {
    if (!selectedYield || !sellAmountCryptoPrecision) return undefined
    const apyDecimal = selectedYield.rewardRate?.total ?? 0
    const amount = bnOrZero(sellAmountCryptoPrecision)
    if (amount.isZero()) return undefined
    return amount.times(apyDecimal).decimalPlaces(6).toString()
  }, [selectedYield, sellAmountCryptoPrecision])

  const {
    step,
    transactionSteps,
    displaySteps,
    isSubmitting,
    activeStepIndex,
    canSubmit,
    handleConfirm,
    isQuoteLoading,
    quoteData,
    isAllowanceCheckPending,
    isUsdtResetRequired,
  } = useYieldTransactionFlow({
    yieldItem: selectedYield ?? defaultYieldItem,
    action: 'enter',
    amount: sellAmountCryptoPrecision,
    assetSymbol: sellAsset?.symbol ?? '',
    onClose: handleClose,
    isOpen: Boolean(selectedYield),
    validatorAddress: selectedValidatorAddress,
    accountId: accountIdToUse,
  })

  // Align loading states with YieldEnterModal
  const isQuoteActive = isQuoteLoading || isAllowanceCheckPending
  const isLoading = isLoadingYields || isQuoteActive

  // Use stepsToShow pattern from YieldEnterModal - show transactionSteps once execution starts
  const stepsToShow = activeStepIndex >= 0 ? transactionSteps : displaySteps

  const confirmButtonText = useMemo(() => {
    // Use the current step's type/title for a clean button label (e.g., "Enter", "Approve")
    if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]) {
      const currentStep = transactionSteps[activeStepIndex]
      return getTransactionButtonText(currentStep.type, currentStep.originalTitle)
    }
    // USDT reset required before other transactions
    if (isUsdtResetRequired) {
      return translate('yieldXYZ.resetAllowance')
    }
    // Before execution starts, use the first CREATED transaction from quoteData
    const firstCreatedTx = quoteData?.transactions?.find(tx => tx.status === 'CREATED')
    if (firstCreatedTx) {
      return getTransactionButtonText(firstCreatedTx.type, firstCreatedTx.title)
    }
    // Fallback states
    if (isLoading) return translate('common.loadingText')
    return translate('yieldXYZ.enter')
  }, [activeStepIndex, transactionSteps, isUsdtResetRequired, quoteData, isLoading, translate])

  const providerInfo = useMemo(() => {
    if (selectedValidator) {
      return { name: selectedValidator.name, logoURI: selectedValidator.logoURI }
    }
    if (selectedYield) {
      const provider = providers?.[selectedYield.providerId]
      if (provider) {
        return { name: provider.name, logoURI: provider.logoURI }
      }
      return { name: selectedYield.metadata.name, logoURI: selectedYield.metadata.logoURI }
    }
    return null
  }, [selectedValidator, selectedYield, providers])

  if (!selectedYield) {
    return (
      <SharedConfirm
        bodyContent={
          <VStack spacing={4} p={6} flex={1} justify='center'>
            <Text>{translate('earn.selectYieldOpportunity')}</Text>
            <Button onClick={handleBack}>{translate('common.goBack')}</Button>
          </VStack>
        }
        footerContent={null}
        onBack={handleBack}
        headerTranslation='earn.confirmEarn'
      />
    )
  }

  if (step === ModalStep.Success) {
    return (
      <SharedConfirm
        bodyContent={
          <Flex direction='column' width='full' flex={1} p={6}>
            <YieldSuccess
              amount={sellAmountCryptoPrecision}
              symbol={sellAsset?.symbol ?? ''}
              providerInfo={providerInfo}
              transactionSteps={transactionSteps}
              yieldId={selectedYieldId}
              onDone={handleClose}
            />
          </Flex>
        }
        footerContent={null}
        onBack={handleBack}
        headerTranslation='yieldXYZ.success'
      />
    )
  }

  const bodyContent = (
    <Flex direction='column' width='full' flex={1}>
      <Box px={6}>
        <YieldAssetFlow
          assetSymbol={sellAsset?.symbol ?? ''}
          assetLogoURI={sellAssetFromState?.icon ?? ''}
          providerName={providerInfo?.name ?? ''}
          providerLogoURI={providerInfo?.logoURI}
          direction='enter'
        />

        <Box
          bg='background.surface.raised.base'
          borderRadius='xl'
          p={4}
          borderWidth='1px'
          borderColor='border.base'
        >
          <HStack justify='space-between'>
            <Text color='text.subtle' fontSize='sm'>
              {translate('common.amount')}
            </Text>
            {isLoading ? (
              <Skeleton height='20px' width='100px' />
            ) : (
              <Amount.Crypto
                value={sellAmountCryptoPrecision}
                symbol={sellAsset?.symbol ?? ''}
                fontWeight='medium'
                fontSize='sm'
              />
            )}
          </HStack>

          <HStack justify='space-between' mt={3}>
            <Text color='text.subtle' fontSize='sm'>
              {translate('common.apy')}
            </Text>
            {isLoading ? (
              <Skeleton height='20px' width='60px' />
            ) : (
              <GradientApy fontSize='sm' fontWeight='bold'>
                {apy.toFixed(2)}%
              </GradientApy>
            )}
          </HStack>

          {estimatedYearlyEarnings && (
            <HStack justify='space-between' mt={3}>
              <Text color='text.subtle' fontSize='sm'>
                {translate('yieldXYZ.estEarnings')}
              </Text>
              {isLoading ? (
                <Skeleton height='20px' width='80px' />
              ) : (
                <Flex direction='column' align='flex-end'>
                  <GradientApy fontSize='sm' fontWeight='bold'>
                    {translate('yieldXYZ.earningsPerYear', {
                      amount: estimatedYearlyEarnings,
                      symbol: sellAsset?.symbol ?? '',
                    })}
                  </GradientApy>
                  {sellAmountUserCurrency && (
                    <Text fontSize='xs' color='text.subtle'>
                      <Amount.Fiat
                        value={bnOrZero(estimatedYearlyEarnings)
                          .times(sellAssetUserCurrencyRate ?? 0)
                          .toString()}
                      />
                    </Text>
                  )}
                </Flex>
              )}
            </HStack>
          )}

          {providerInfo && (
            <HStack justify='space-between' mt={3}>
              <Text color='text.subtle' fontSize='sm'>
                {selectedValidator
                  ? translate('yieldXYZ.validator')
                  : translate('yieldXYZ.provider')}
              </Text>
              <HStack spacing={2}>
                <Avatar size='xs' src={providerInfo.logoURI} name={providerInfo.name} />
                <Text fontWeight='medium' fontSize='sm'>
                  {providerInfo.name}
                </Text>
              </HStack>
            </HStack>
          )}
        </Box>

        {stepsToShow.length > 0 && (
          <Box mt={4}>
            <TransactionStepsList steps={stepsToShow} />
          </Box>
        )}
      </Box>
    </Flex>
  )

  const footerContent = (
    <Box p={4}>
      <Button
        colorScheme='blue'
        size='lg'
        width='full'
        onClick={handleConfirm}
        isLoading={isSubmitting || (isQuoteActive && Boolean(sellAmountCryptoPrecision))}
        isDisabled={!canSubmit || isLoading}
      >
        {confirmButtonText}
      </Button>
    </Box>
  )

  return (
    <SharedConfirm
      bodyContent={bodyContent}
      footerContent={footerContent}
      onBack={handleBack}
      headerTranslation='earn.confirmEarn'
    />
  )
})
