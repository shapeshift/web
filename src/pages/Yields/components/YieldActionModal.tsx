import { Avatar, Box, Button, Flex, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import {
  getTransactionButtonText,
  getYieldActionLabelKeys,
  isStakingYieldType,
} from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { TransactionStepsList } from '@/pages/Yields/components/TransactionStepsList'
import { YieldAssetFlow } from '@/pages/Yields/components/YieldAssetFlow'
import { YieldSuccess } from '@/pages/Yields/components/YieldSuccess'
import { ModalStep, useYieldTransactionFlow } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldActionModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  action: 'enter' | 'exit' | 'manage'
  amount: string
  assetSymbol: string
  assetLogoURI?: string
  validatorAddress?: string
  validatorName?: string
  validatorLogoURI?: string
  passthrough?: string
  manageActionType?: string
  accountId?: string
}

export const YieldActionModal = memo(function YieldActionModal({
  isOpen,
  onClose,
  yieldItem,
  action,
  amount,
  assetSymbol,
  assetLogoURI,
  validatorAddress,
  validatorName,
  validatorLogoURI,
  passthrough,
  accountId,
  ...props
}: YieldActionModalProps) {
  const translate = useTranslate()

  const {
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
  } = useYieldTransactionFlow({
    yieldItem,
    action,
    amount,
    assetSymbol,
    onClose,
    isOpen,
    validatorAddress,
    passthrough,
    manageActionType: props.manageActionType,
    accountId,
  })

  const isStaking = useMemo(
    () => isStakingYieldType(yieldItem.mechanics.type),
    [yieldItem.mechanics.type],
  )

  const actionLabelKeys = useMemo(
    () => getYieldActionLabelKeys(yieldItem.mechanics.type),
    [yieldItem.mechanics.type],
  )

  const shouldFetchValidators = useMemo(
    () => isStaking && yieldItem.mechanics.requiresValidatorSelection,
    [isStaking, yieldItem.mechanics.requiresValidatorSelection],
  )

  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  const { data: providers } = useYieldProviders()
  const inputTokenAssetId = useMemo(
    () => yieldItem.inputTokens[0]?.assetId ?? '',
    [yieldItem.inputTokens],
  )
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId),
  )

  const vaultMetadata = useMemo(() => {
    if (isStaking && validatorAddress) {
      const validator = validators?.find(v => v.address === validatorAddress)
      if (validator) return { name: validator.name, logoURI: validator.logoURI }
      if (validatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
        return { name: SHAPESHIFT_VALIDATOR_NAME, logoURI: SHAPESHIFT_VALIDATOR_LOGO }
      }
      if (validatorName) return { name: validatorName, logoURI: validatorLogoURI }
    }
    const provider = providers?.[yieldItem.providerId]
    if (provider) return { name: provider.name, logoURI: provider.logoURI }
    return { name: 'Vault', logoURI: yieldItem.metadata.logoURI }
  }, [
    isStaking,
    yieldItem,
    validatorAddress,
    validatorName,
    validatorLogoURI,
    validators,
    providers,
  ])

  const chainId = useMemo(() => yieldItem.chainId ?? '', [yieldItem.chainId])
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))

  const assetAvatarSrc = useMemo(
    () => assetLogoURI ?? yieldItem.token.logoURI,
    [assetLogoURI, yieldItem.token.logoURI],
  )

  const aprFormatted = useMemo(
    () => `${bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)}%`,
    [yieldItem.rewardRate.total],
  )

  const showEstimatedEarnings = useMemo(() => bnOrZero(amount).gt(0), [amount])

  const estimatedEarningsAmount = useMemo(
    () =>
      translate('yieldXYZ.earningsPerYear', {
        amount: bnOrZero(amount).times(yieldItem.rewardRate.total).decimalPlaces(4).toString(),
        symbol: assetSymbol,
      }),
    [amount, yieldItem.rewardRate.total, assetSymbol, translate],
  )

  const estimatedEarningsFiat = useMemo(
    () =>
      bnOrZero(amount)
        .times(yieldItem.rewardRate.total)
        .times(marketData?.price ?? 0)
        .toString(),
    [amount, yieldItem.rewardRate.total, marketData?.price],
  )

  const showValidatorRow = useMemo(
    () => isStaking && Boolean(validatorAddress),
    [isStaking, validatorAddress],
  )

  const isButtonDisabled = useMemo(
    () => !canSubmit || isSubmitting || isQuoteLoading,
    [canSubmit, isSubmitting, isQuoteLoading],
  )

  const isButtonLoading = useMemo(
    () => isSubmitting || isQuoteLoading || isAllowanceCheckPending,
    [isSubmitting, isQuoteLoading, isAllowanceCheckPending],
  )

  const loadingText = useMemo(() => {
    if (isQuoteLoading) return translate('yieldXYZ.loadingQuote')
    if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]?.loadingMessage) {
      return transactionSteps[activeStepIndex].loadingMessage
    }
    if (action === 'enter') return translate('yieldXYZ.entering')
    if (action === 'exit') {
      return translate(isStaking ? 'yieldXYZ.unstakingLoading' : 'yieldXYZ.withdrawing')
    }
    return translate('common.claiming')
  }, [isQuoteLoading, action, translate, activeStepIndex, transactionSteps, isStaking])

  const buttonText = useMemo(() => {
    // Use the current step's type/title for a clean button label (e.g., "Enter", "Exit", "Approve")
    if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]) {
      const step = transactionSteps[activeStepIndex]
      return getTransactionButtonText(step.type, step.originalTitle)
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
    // Fallback to action-based text
    if (action === 'enter') return translate(actionLabelKeys.enter)
    if (action === 'exit') return translate(actionLabelKeys.exit)
    return translate('common.claim')
  }, [
    action,
    translate,
    activeStepIndex,
    transactionSteps,
    quoteData,
    isUsdtResetRequired,
    actionLabelKeys,
  ])

  const modalHeading = useMemo(() => {
    if (action === 'enter') return translate('yieldXYZ.enterSymbol', { symbol: assetSymbol })
    if (action === 'exit') {
      const exitKey = isStaking ? 'yieldXYZ.unstakeSymbol' : 'yieldXYZ.withdrawSymbol'
      return translate(exitKey, { symbol: assetSymbol })
    }
    return translate('yieldXYZ.claimSymbol', { symbol: assetSymbol })
  }, [action, assetSymbol, translate, isStaking])

  const networkAvatarSrc = useMemo(
    () => feeAsset?.networkIcon ?? feeAsset?.icon,
    [feeAsset?.networkIcon, feeAsset?.icon],
  )

  const assetFlowDirection = action === 'exit' ? 'exit' : 'enter'

  const animatedAvatarRow = useMemo(
    () => (
      <YieldAssetFlow
        assetSymbol={assetSymbol}
        assetLogoURI={assetAvatarSrc}
        providerName={vaultMetadata.name}
        providerLogoURI={vaultMetadata.logoURI}
        direction={assetFlowDirection}
      />
    ),
    [assetSymbol, assetAvatarSrc, vaultMetadata.name, vaultMetadata.logoURI, assetFlowDirection],
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
            {translate('common.amount')}
          </Text>
          <Amount.Crypto value={amount} symbol={assetSymbol} fontSize='sm' fontWeight='medium' />
        </Flex>
        {action === 'enter' && (
          <>
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.apr')}
              </Text>
              <GradientApy fontSize='sm' fontWeight='bold'>
                {aprFormatted}
              </GradientApy>
            </Flex>
            {showEstimatedEarnings && (
              <Flex justify='space-between' align='center' mt={3}>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('yieldXYZ.estEarnings')}
                </Text>
                <Flex direction='column' align='flex-end'>
                  <GradientApy fontSize='sm' fontWeight='bold'>
                    {estimatedEarningsAmount}
                  </GradientApy>
                  <Text fontSize='xs' color='text.subtle'>
                    <Amount.Fiat value={estimatedEarningsFiat} />
                  </Text>
                </Flex>
              </Flex>
            )}
          </>
        )}
        {showValidatorRow && (
          <Flex justify='space-between' align='center' mt={3}>
            <Text fontSize='sm' color='text.subtle'>
              {translate('yieldXYZ.validator')}
            </Text>
            <Flex align='center' gap={2}>
              <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
              <Text fontSize='sm' fontWeight='medium'>
                {vaultMetadata.name}
              </Text>
            </Flex>
          </Flex>
        )}
        {!showValidatorRow && (
          <Flex justify='space-between' align='center' mt={3}>
            <Text fontSize='sm' color='text.subtle'>
              {translate('yieldXYZ.provider')}
            </Text>
            <Flex align='center' gap={2}>
              <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
              <Text fontSize='sm' fontWeight='medium'>
                {vaultMetadata.name}
              </Text>
            </Flex>
          </Flex>
        )}
        <Flex justify='space-between' align='center' mt={3}>
          <Text fontSize='sm' color='text.subtle'>
            {translate('yieldXYZ.network')}
          </Text>
          <Flex align='center' gap={2}>
            {feeAsset && <Avatar size='xs' src={networkAvatarSrc} name={yieldItem.network} />}
            <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
              {yieldItem.network}
            </Text>
          </Flex>
        </Flex>
      </Box>
    ),
    [
      amount,
      assetSymbol,
      action,
      translate,
      aprFormatted,
      showEstimatedEarnings,
      estimatedEarningsAmount,
      estimatedEarningsFiat,
      showValidatorRow,
      vaultMetadata.logoURI,
      vaultMetadata.name,
      feeAsset,
      networkAvatarSrc,
      yieldItem.network,
    ],
  )

  const actionContent = useMemo(
    () => (
      <Flex direction='column' gap={4} height='full'>
        {animatedAvatarRow}
        {statsContent}
        <TransactionStepsList steps={displaySteps} />
      </Flex>
    ),
    [animatedAvatarRow, statsContent, displaySteps],
  )

  const successMessageKey = useMemo(() => {
    if (action === 'enter') return 'successEnter' as const
    if (action === 'exit')
      return isStaking ? ('successUnstaked' as const) : ('successWithdrawn' as const)
    return 'successClaim' as const
  }, [action, isStaking])

  const successProviderInfo = useMemo(
    () => (vaultMetadata ? { name: vaultMetadata.name, logoURI: vaultMetadata.logoURI } : null),
    [vaultMetadata],
  )

  const successContent = useMemo(
    () => (
      <YieldSuccess
        amount={amount}
        symbol={assetSymbol}
        providerInfo={successProviderInfo}
        transactionSteps={transactionSteps}
        yieldId={yieldItem.id}
        accountId={accountId}
        onDone={handleClose}
        successMessageKey={successMessageKey}
      />
    ),
    [
      amount,
      assetSymbol,
      successProviderInfo,
      transactionSteps,
      yieldItem.id,
      accountId,
      handleClose,
      successMessageKey,
    ],
  )

  const isInProgress = step === ModalStep.InProgress
  const isSuccess = step === ModalStep.Success

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      isFullScreen
      modalProps={{ closeOnOverlayClick: !isSubmitting }}
    >
      <DialogHeader>
        <DialogHeader.Left>{null}</DialogHeader.Left>
        <DialogHeader.Middle>
          <DialogTitle>{isSuccess ? translate('common.success') : modalHeading}</DialogTitle>
        </DialogHeader.Middle>
        <DialogHeader.Right>
          <DialogCloseButton isDisabled={isSubmitting} />
        </DialogHeader.Right>
      </DialogHeader>
      <DialogBody py={4} flex={1}>
        {isInProgress && actionContent}
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
            isDisabled={isButtonDisabled}
            isLoading={isButtonLoading}
            loadingText={loadingText}
            onClick={handleConfirm}
          >
            {buttonText}
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
            onClick={handleClose}
          >
            {translate('common.close')}
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  )
})
