import { Button, CardFooter, Collapse, Flex, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { encodeFunctionData, getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { AmountSlider } from 'components/AmountSlider'
import { FormDivider } from 'components/FormDivider'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { formatSecondsToDuration } from 'lib/utils/time'
import { ReadOnlyAsset } from 'pages/ThorChainLP/components/ReadOnlyAsset'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UnstakeSummary } from './components/UnstakeSummary'
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
  stakingAssetId?: AssetId
  setConfirmedQuote: (quote: RfoxUnstakingQuote | undefined) => void
}

export const UnstakeInput: React.FC<UnstakeRouteProps & UnstakeInputProps> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  setConfirmedQuote,
  headerComponent,
}) => {
  const wallet = useWallet().state.wallet
  const translate = useTranslate()
  const history = useHistory()

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

  const percentage = useWatch<UnstakeInputValues, 'percentage'>({
    control,
    name: 'percentage',
  })

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const [showWarning, setShowWarning] = useState(false)
  const percentOptions = useMemo(() => [], [])
  const [sliderValue, setSliderValue] = useState<number>(100)
  // const [percentageSelection, setPercentageSelection] = useState<number>(50)

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  // TODO(gomes): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: stakingAssetId,
      accountId: stakingAssetAccountId,
    }
  }, [stakingAssetAccountId, stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAsset?.assetId ?? ''),
  )

  const {
    data: userStakingBalanceOfCryptoBaseUnit,
    isSuccess: isUserBalanceStakingBalanceOfCryptoBaseUnitSuccess,
  } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'stakingInfo',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)], // actually defined, see enabled below
    chainId: arbitrum.id,
    query: {
      enabled: Boolean(stakingAssetAccountAddress),
      select: ([stakingBalance]) => stakingBalance.toString(),
    },
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

  const handleChange = useCallback((_value: string, isFiat?: boolean) => {
    if (isFiat) {
      // setFiatAmount(value)
    } else {
      // setCryptoAmount(value)
    }
  }, [])

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

  const { data: cooldownPeriod } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatSecondsToDuration(Number(data)),
    },
  })

  const callData = useMemo(() => {
    if (!hasEnteredValue) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'unstake',
      args: [BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0))],
    })
  }, [amountCryptoPrecision, hasEnteredValue, stakingAsset?.precision])

  const isGetUnstakeFeesEnabled = useMemo(
    () =>
      Boolean(
        stakingAssetAccountId &&
          stakingAssetAccountNumber !== undefined &&
          hasEnteredValue &&
          wallet &&
          stakingAsset &&
          callData &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.amountFieldInput),
      ),
    [
      stakingAssetAccountId,
      stakingAssetAccountNumber,
      hasEnteredValue,
      wallet,
      stakingAsset,
      callData,
      feeAsset,
      feeAssetMarketData,
      errors.amountFieldInput,
    ],
  )

  const {
    data: unstakeFees,
    isLoading: isUnstakeFeesLoading,
    isSuccess: isUnstakeFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : '', // see isGetStakeFeesEnabled
      accountNumber: stakingAssetAccountNumber!, // see isGetStakeFeesEnabled
      data: callData!, // see isGetStakeFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetStakeFeesEnabled
      feeAsset: feeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetUnstakeFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

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

  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('RFOX.unstakeWarning', {
          cooldownPeriod,
        })}
        onAcknowledge={handleSubmit}
        shouldShowWarningAcknowledgement={showWarning}
        setShouldShowWarningAcknowledgement={setShowWarning}
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
                />
                <Flex
                  width='full'
                  px={6}
                  py={4}
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
              layout='inline'
              onAccountIdChange={handleAccountIdChange}
              onChange={handleChange}
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
            <Button
              size='lg'
              mx={-2}
              onClick={handleWarning}
              colorScheme={Boolean(errors.amountFieldInput) ? 'red' : 'blue'}
              isDisabled={Boolean(
                !hasEnteredValue ||
                  !isUnstakeFeesSuccess ||
                  Boolean(errors.amountFieldInput) ||
                  !cooldownPeriod,
              )}
              isLoading={isUnstakeFeesLoading}
            >
              {errors.amountFieldInput?.message || translate('RFOX.unstake')}
            </Button>
          </CardFooter>
        </FormProvider>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
