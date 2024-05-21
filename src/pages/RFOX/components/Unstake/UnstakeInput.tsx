import { Button, CardFooter, Collapse, Flex, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { getAddress } from 'viem'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { UnstakeInputValues } from 'pages/RFOX/types'
import { ReadOnlyAsset } from 'pages/ThorChainLP/components/ReadOnlyAsset'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UnstakeSummary } from './components/UnstakeSummary'
import type { UnstakeRouteProps } from './types'
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
}

export const UnstakeInput: React.FC<UnstakeRouteProps & UnstakeInputProps> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  headerComponent,
}) => {
  const translate = useTranslate()
  const history = useHistory()

  const methods = useForm<UnstakeInputValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: false,
  })

  const { control, setValue } = methods

  const amountCryptoPrecision = useWatch<UnstakeInputValues, 'amountCryptoPrecision'>({
    control,
    name: 'amountCryptoPrecision',
  })
  const amountUserCurrency = useWatch<UnstakeInputValues, 'amountUserCurrency'>({
    control,
    name: 'amountUserCurrency',
  })

  const amountFieldInput = useWatch<UnstakeInputValues, 'amountFieldInput'>({
    control,
    name: 'amountFieldInput',
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

  const handleAccountIdChange = useCallback(() => {}, [])

  const hasEnteredValue = useMemo(() => percentage > 0, [percentage])

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

  const handleSubmit = useCallback(() => {
    history.push(UnstakeRoutePaths.Confirm)
  }, [history])

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

      console.log({ fiatValue, cryptoValue, userStakingBalanceUserCurrency })

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

  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('RFOX.unstakeWarning', {
          cooldownPeriod: '28-day',
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
              // amountFieldInputRules={amountFieldInputRules} TODO(gomes): implement me, validate has enough fee balance here
              assetIcon={stakingAsset?.icon ?? ''}
              assetId={stakingAsset?.assetId}
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
                  stakingAssetId={stakingAsset.assetId}
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
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('common.gasFee')}</Row.Label>
                  <Row.Value>
                    <Amount.Fiat value='10' />
                  </Row.Value>
                </Row>
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('common.fees')}</Row.Label>
                  <Row.Value>
                    <Amount.Fiat value='0.0' />
                  </Row.Value>
                </Row>
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
              colorScheme='blue'
              isDisabled={!hasEnteredValue}
            >
              {translate('RFOX.unstake')}
            </Button>
          </CardFooter>
        </FormProvider>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
