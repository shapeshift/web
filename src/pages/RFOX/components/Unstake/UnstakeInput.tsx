import { CardBody, CardFooter, Collapse, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { Amount } from 'components/Amount/Amount'
import { AmountSlider } from 'components/AmountSlider'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { FormDivider } from 'components/FormDivider'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { selectStakingBalance } from 'pages/RFOX/helpers'
import { useCooldownPeriodQuery } from 'pages/RFOX/hooks/useCooldownPeriodQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { ReadOnlyAsset } from 'pages/ThorChainLP/components/ReadOnlyAsset'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ChainNotSupported } from '../Shared/ChainNotSupported'
import { ConnectWallet } from '../Shared/ConnectWallet'
import { UnstakeSummary } from './components/UnstakeSummary'
import { useRfoxUnstake } from './hooks/useRfoxUnstake'
import type { RfoxUnstakingQuote, UnstakeInputValues, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 4,
  paddingTop: 0,
}

const defaultFormValues = {
  amountFieldInput: '',
  amountCryptoPrecision: '',
  amountUserCurrency: '',
  percentage: 100,
}

type UnstakeInputProps = {
  setConfirmedQuote: (quote: RfoxUnstakingQuote | undefined) => void
}

export const UnstakeInput: React.FC<UnstakeRouteProps & UnstakeInputProps> = ({
  setConfirmedQuote,
  headerComponent,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const { stakingAssetId, stakingAssetAccountId } = useRFOXContext()

  const methods = useForm<UnstakeInputValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: false,
  })

  const {
    trigger,
    formState: { errors },
    control,
    setValue,
  } = methods

  const amountCryptoPrecision = useWatch<UnstakeInputValues, 'amountCryptoPrecision'>({
    control,
    name: 'amountCryptoPrecision',
  })
  const amountUserCurrency = useWatch<UnstakeInputValues, 'amountUserCurrency'>({
    control,
    name: 'amountUserCurrency',
  })

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const amountCryptoBaseUnit = useMemo(
    () => toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0),
    [amountCryptoPrecision, stakingAsset?.precision],
  )

  const {
    state: { isConnected, wallet },
  } = useWallet()

  const isChainSupportedByWallet = useWalletSupportsChain(
    fromAssetId(stakingAssetId).chainId,
    wallet,
  )

  const percentage = useWatch<UnstakeInputValues, 'percentage'>({
    control,
    name: 'percentage',
  })

  const [showWarning, setShowWarning] = useState(false)
  const percentOptions = useMemo(() => [], [])
  const [sliderValue, setSliderValue] = useState<number>(100)

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAsset?.assetId ?? ''),
  )

  const {
    isGetUnstakeFeesEnabled,
    unstakeFeesQuery: {
      data: unstakeFees,
      isLoading: isUnstakeFeesLoading,
      isSuccess: isUnstakeFeesSuccess,
    },
  } = useRfoxUnstake({
    stakingAssetId,
    stakingAssetAccountId,
    amountCryptoBaseUnit,
    methods,
    // Not required at this stage just yet, we're only estimating fees
    unstakeTxid: undefined,
    setUnstakeTxid: undefined,
  })

  const {
    data: userStakingBalanceOfCryptoBaseUnit,
    isSuccess: isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess,
  } = useStakingInfoQuery({
    stakingAssetAccountAddress,
    select: selectStakingBalance,
  })

  const userStakingBalanceCryptoPrecision = useMemo(() => {
    if (!(userStakingBalanceOfCryptoBaseUnit && stakingAsset)) return
    return fromBaseUnit(userStakingBalanceOfCryptoBaseUnit, stakingAsset?.precision)
  }, [stakingAsset, userStakingBalanceOfCryptoBaseUnit])

  const userStakingBalanceUserCurrency = useMemo(() => {
    if (!(userStakingBalanceCryptoPrecision && stakingAssetMarketData)) return

    return bnOrZero(userStakingBalanceCryptoPrecision)
      .times(stakingAssetMarketData?.price ?? 0)
      .toFixed(2)
  }, [stakingAssetMarketData, userStakingBalanceCryptoPrecision])

  const feeAssetBalanceFilter = useMemo(
    () => ({
      accountId: stakingAssetAccountId ?? '',
      assetId: feeAsset?.assetId,
    }),
    [feeAsset?.assetId, stakingAssetAccountId],
  )

  const feeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, feeAssetBalanceFilter),
  )

  const handleAccountIdChange = useCallback(() => {}, [])

  const hasEnteredValue = useMemo(
    () => bnOrZero(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision],
  )

  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handlePercentageSliderChange = useCallback((percentage: number) => {
    setSliderValue(percentage)
  }, [])
  const handlePercentageSliderChangeEnd = useCallback(
    (percentage: number) => {
      const fiatValue = bnOrZero(userStakingBalanceUserCurrency)
        .times(percentage)
        .div(100)
        .toFixed()
      const cryptoValue = bnOrZero(userStakingBalanceCryptoPrecision)
        .times(percentage)
        .div(100)
        .toFixed()

      setValue('amountFieldInput', isFiat ? fiatValue : cryptoValue)
      setValue('amountCryptoPrecision', cryptoValue)
      setValue('amountUserCurrency', fiatValue)
    },
    [isFiat, setValue, userStakingBalanceCryptoPrecision, userStakingBalanceUserCurrency],
  )

  // Set the form values on initial staked balance fetch
  useEffect(() => {
    if (!userStakingBalanceCryptoPrecision || !userStakingBalanceUserCurrency) return
    if (amountCryptoPrecision && amountUserCurrency) return

    handlePercentageSliderChangeEnd(percentage)
  }, [
    amountCryptoPrecision,
    amountUserCurrency,
    handlePercentageSliderChangeEnd,
    percentage,
    stakingAssetMarketData,
    userStakingBalanceCryptoPrecision,
    userStakingBalanceUserCurrency,
  ])

  const handlePercentageClick = useCallback((percentage: number) => {
    setSliderValue(percentage)
  }, [])

  const { data: cooldownPeriod } = useCooldownPeriodQuery()

  const handleSubmit = useCallback(() => {
    if (!(stakingAssetAccountId && hasEnteredValue && stakingAsset && cooldownPeriod)) return

    setConfirmedQuote({
      stakingAssetAccountId,
      stakingAssetId,
      unstakingAmountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, stakingAsset.precision),
      cooldownPeriod,
    })

    history.push(UnstakeRoutePaths.Confirm)
  }, [
    amountCryptoPrecision,
    cooldownPeriod,
    hasEnteredValue,
    history,
    setConfirmedQuote,
    stakingAsset,
    stakingAssetAccountId,
    stakingAssetId,
  ])

  const validateHasEnoughFeeBalance = useCallback(
    (input: string) => {
      if (bnOrZero(input).isZero()) return true
      if (bnOrZero(feeAssetBalanceCryptoPrecision).isZero()) return false

      const fees = unstakeFees

      const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
        toBaseUnit(feeAssetBalanceCryptoPrecision, feeAsset?.precision ?? 0),
      )

      if (!hasEnoughFeeBalance) return false

      return true
    },
    [feeAsset?.precision, feeAssetBalanceCryptoPrecision, unstakeFees],
  )

  // Trigger re-validation since react-hook-form validation methods are fired onChange and not in a component-reactive manner
  useEffect(() => {
    trigger('amountFieldInput')
  }, [
    feeAsset?.precision,
    feeAsset?.symbol,
    feeAssetBalanceCryptoPrecision,
    amountCryptoPrecision,
    amountUserCurrency,
    unstakeFees,
    trigger,
  ])

  const amountFieldInputRules = useMemo(() => {
    return {
      defaultValue: '',
      validate: {
        hasEnoughFeeBalance: (input: string) =>
          validateHasEnoughFeeBalance(input) ||
          translate('modals.send.errors.notEnoughNativeToken', { asset: feeAsset?.symbol }),
      },
    }
  }, [feeAsset?.symbol, translate, validateHasEnoughFeeBalance])

  const chainNotSupportedByWalletCopy = useMemo(() => {
    if (isChainSupportedByWallet) return
    return translate('trade.errors.quoteUnsupportedChain')
  }, [isChainSupportedByWallet, translate])

  if (!isConnected)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ConnectWallet />
        </CardBody>
      </SlideTransition>
    )

  if (!stakingAssetAccountAddress)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ChainNotSupported chainId={stakingAsset?.chainId} />
        </CardBody>
      </SlideTransition>
    )

  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('RFOX.unstakeWarning', {
          cooldownPeriod,
        })}
        onAcknowledge={handleSubmit}
        shouldShowAcknowledgement={showWarning}
        setShouldShowAcknowledgement={setShowWarning}
      >
        <FormProvider {...methods}>
          <Stack>
            {headerComponent}
            <Skeleton isLoaded={isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess}>
              <Stack>
                <AmountSlider
                  sliderValue={sliderValue}
                  handlePercentageSliderChange={handlePercentageSliderChange}
                  onPercentageClick={handlePercentageClick}
                  handlePercentageSliderChangeEnd={handlePercentageSliderChangeEnd}
                >
                  <Flex
                    width='full'
                    justifyContent='space-between'
                    fontSize='xs'
                    color='text.subtle'
                  >
                    <Skeleton isLoaded={isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess}>
                      <Amount.Fiat value={0} />
                    </Skeleton>
                    <Skeleton isLoaded={isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess}>
                      {/* Actually defined at display time, see isLoaded above */}
                      <Amount.Fiat value={userStakingBalanceUserCurrency ?? 0} />
                    </Skeleton>
                  </Flex>
                </AmountSlider>
              </Stack>
            </Skeleton>
            <FormDivider />
            <TradeAssetInput
              amountFieldInputRules={amountFieldInputRules}
              assetIcon={stakingAsset?.icon ?? ''}
              assetId={stakingAssetId}
              assetSymbol={stakingAsset?.symbol ?? ''}
              cryptoAmount={amountCryptoPrecision}
              fiatAmount={amountUserCurrency}
              formControlProps={formControlProps}
              // TODO(gomes): bring me back when multi account is implemented
              isAccountSelectionDisabled
              isAccountSelectionHidden
              isFiat={isFiat}
              isReadOnly
              isSendMaxDisabled={true}
              layout='stacked'
              onAccountIdChange={handleAccountIdChange}
              onToggleIsFiat={handleToggleIsFiat}
              percentOptions={percentOptions}
              rightComponent={ReadOnlyAsset}
              showInputSkeleton={!isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess}
            />

            <Collapse in={hasEnteredValue}>
              {stakingAssetAccountId && (
                <UnstakeSummary
                  amountCryptoPrecision={amountCryptoPrecision ?? 0}
                  stakingAssetAccountId={stakingAssetAccountId}
                  stakingAssetId={stakingAssetId}
                  isLoading={!isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess}
                />
              )}
              <CardFooter
                borderTopWidth={1}
                borderColor='border.subtle'
                flexDir='column'
                gap={4}
                px={6}
                py={4}
                bg='background.surface.raised.accent'
              >
                {isGetUnstakeFeesEnabled && (
                  <Row fontSize='sm' fontWeight='medium'>
                    <Row.Label>{translate('common.gasFee')}</Row.Label>
                    <Row.Value>
                      <Skeleton isLoaded={Boolean(!isUnstakeFeesLoading && unstakeFees)}>
                        <Amount.Fiat value={unstakeFees?.txFeeFiat ?? 0} />
                      </Skeleton>
                    </Row.Value>
                  </Row>
                )}
              </CardFooter>
            </Collapse>
          </Stack>
          <CardFooter
            borderTopWidth={1}
            borderColor='border.subtle'
            flexDir='column'
            gap={4}
            px={6}
            bg='background.surface.raised.accent'
            borderBottomRadius='xl'
          >
            <ButtonWalletPredicate
              isValidWallet={Boolean(isChainSupportedByWallet)}
              isDisabled={Boolean(
                !hasEnteredValue ||
                  !isUnstakeFeesSuccess ||
                  Boolean(errors.amountFieldInput) ||
                  !cooldownPeriod,
              )}
              size='lg'
              mx={-2}
              onClick={handleWarning}
              colorScheme={Boolean(errors.amountFieldInput) ? 'red' : 'blue'}
              isLoading={isUnstakeFeesLoading}
            >
              {errors.amountFieldInput?.message ||
                chainNotSupportedByWalletCopy ||
                translate('RFOX.unstake')}
            </ButtonWalletPredicate>
          </CardFooter>
        </FormProvider>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
