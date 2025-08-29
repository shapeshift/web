import {
  CardFooter,
  Flex,
  FormControl,
  HStack,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { useTcyStaker } from '../../queries/useTcyStaker'
import type { CurrentAccount } from '../../tcy'
import type { TCYRouteProps } from '../../types'
import { TCYUnstakeRoute } from '../../types'
import type { UnstakeFormValues } from './Unstake'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import { BASE_BPS_POINTS, THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useIsChainHalted } from '@/lib/utils/thorchain/hooks/useIsChainHalted'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByFilter } from '@/state/slices/marketDataSlice/selectors'
import { useAppSelector } from '@/state/store'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}

export const ReadOnlyAsset: React.FC<{ assetId: AssetId }> = ({ assetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  return (
    <HStack
      my='auto'
      backgroundColor='background.surface.raised.base'
      px={3}
      py={2}
      borderRadius='full'
    >
      <AssetIcon size='xs' assetId={assetId} />
      <RawText fontWeight='medium'>{asset?.symbol}</RawText>
    </HStack>
  )
}

type AmountFieldName = 'amountCryptoPrecision' | 'fiatAmount'

export const UnstakeInput: React.FC<TCYRouteProps & { currentAccount: CurrentAccount }> = ({
  headerComponent,
  currentAccount,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const {
    state: { isConnected },
  } = useWallet()
  const { isChainHalted, isFetching: isChainHaltedFetching } = useIsChainHalted(thorchainChainId)
  const selectedStakingAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const {
    register,
    setValue,
    formState: { errors, isValid },
  } = useFormContext<UnstakeFormValues>()
  const [fieldName, setFieldName] = useState<AmountFieldName>('amountCryptoPrecision')
  const [unstakePercent, setUnstakePercent] = useState(100)

  const amountCryptoPrecision = useWatch<UnstakeFormValues, 'amountCryptoPrecision'>({
    name: 'amountCryptoPrecision',
  })
  const fiatAmount = useWatch<UnstakeFormValues, 'fiatAmount'>({
    name: 'fiatAmount',
  })

  const { price: assetUserCurrencyRate = '0' } =
    useAppSelector(state =>
      selectMarketDataByFilter(state, { assetId: selectedStakingAsset?.assetId }),
    ) ?? {}

  const { accountId } = currentAccount

  const { data: tcyStaker } = useTcyStaker(accountId)

  const stakedAmountCryptoPrecision = useMemo(
    () => fromThorBaseUnit(tcyStaker?.amount ?? 0).toFixed(),
    [tcyStaker?.amount],
  )

  const stakedAmountFiatUserCurrency = useMemo(
    () => bn(stakedAmountCryptoPrecision).times(assetUserCurrencyRate).toFixed(2),
    [stakedAmountCryptoPrecision, assetUserCurrencyRate],
  )

  const withdrawBps = useMemo(() => {
    if (!tcyStaker?.amount) return '0'
    const amountThorBaseUnit = toBaseUnit(amountCryptoPrecision, THOR_PRECISION)
    const stakedAmountCryptoBaseUnit = toBaseUnit(tcyStaker.amount, THOR_PRECISION)
    const withdrawRatio = bnOrZero(amountThorBaseUnit).div(stakedAmountCryptoBaseUnit)
    return withdrawRatio.times(BASE_BPS_POINTS).toFixed(0)
  }, [tcyStaker?.amount, amountCryptoPrecision])

  const handleAmountChange = useCallback(
    (inputValue: string) => {
      if (inputValue === '') {
        setValue('amountCryptoPrecision', '')
        setValue('fiatAmount', '')
        return
      }

      const price = assetUserCurrencyRate ?? 0
      const cryptoAmount = inputValue
      const fiatAmount = bnOrZero(cryptoAmount).times(bnOrZero(price))

      setValue('amountCryptoPrecision', cryptoAmount.toString())
      setValue('fiatAmount', fiatAmount.toString())
    },
    [setValue, assetUserCurrencyRate],
  )

  const handleUnstakePercentChange = useCallback(
    (value: number) => {
      setUnstakePercent(value)
      if (!tcyStaker?.amount) {
        setValue('amountCryptoPrecision', '0')
        setValue('fiatAmount', '0')
        return
      }
      const stakedAmount = fromBaseUnit(tcyStaker.amount, THOR_PRECISION)
      const unstakeAmount = bnOrZero(stakedAmount).times(value).div(100).toString()
      handleAmountChange(unstakeAmount)
    },
    [tcyStaker?.amount, handleAmountChange, setValue],
  )

  // Set initial values when component mounts or when staked amount changes
  useEffect(() => {
    handleUnstakePercentChange(unstakePercent)
  }, [unstakePercent, tcyStaker?.amount, handleUnstakePercentChange])

  const { estimatedFeesData, isEstimatedFeesDataLoading, isEstimatedFeesDataError } = useSendThorTx(
    {
      accountId: accountId ?? '',
      action: 'unstakeTcy',
      amountCryptoBaseUnit: '0',
      assetId: tcyAssetId,
      memo: `tcy-:${withdrawBps}`,
      fromAddress: null,
      enableEstimateFees: Boolean(accountId),
    },
  )

  const toggleIsFiat = useCallback(() => {
    setFieldName(fieldName === 'fiatAmount' ? 'amountCryptoPrecision' : 'fiatAmount')
  }, [fieldName])

  const handleUnstake = useCallback(() => {
    navigate(TCYUnstakeRoute.Confirm)
  }, [navigate])

  register('amountCryptoPrecision', {
    validate: (value: string) => {
      if (bnOrZero(value).gt(fromBaseUnit(tcyStaker?.amount, THOR_PRECISION))) {
        return translate('common.insufficientFunds')
      }
      return true
    },
  })

  const isDisabled =
    !isValid ||
    bnOrZero(amountCryptoPrecision).isZero() ||
    isEstimatedFeesDataError ||
    !amountCryptoPrecision ||
    !fiatAmount ||
    isChainHalted

  const confirmCopy = useMemo(() => {
    if (isChainHalted) return translate('common.chainHalted')
    if (errors.amountCryptoPrecision) return errors.amountCryptoPrecision.message
    return translate('defi.unstake')
  }, [errors.amountCryptoPrecision, translate, isChainHalted])

  useEffect(() => {
    setValue('accountId', accountId ?? '')
  }, [accountId, setValue])

  return (
    <Stack>
      {headerComponent}
      <FormControl isInvalid={Boolean(errors.amountCryptoPrecision)}>
        <TradeAssetInput
          assetId={selectedStakingAsset?.assetId ?? ''}
          assetSymbol={selectedStakingAsset?.symbol ?? ''}
          assetIcon={selectedStakingAsset?.icon ?? ''}
          onAccountIdChange={noop}
          label={translate('common.amount')}
          isAccountSelectionDisabled
          placeholder={translate('common.enterAmount')}
          balance={stakedAmountCryptoPrecision}
          onToggleIsFiat={toggleIsFiat}
          onChange={handleAmountChange}
          isFiat={fieldName === 'fiatAmount'}
          cryptoAmount={amountCryptoPrecision}
          fiatAmount={fiatAmount}
          isReadOnly
          isAccountSelectionHidden
          formControlProps={formControlProps}
          rightComponent={ReadOnlyAsset}
          // eslint-disable-next-line react-memo/require-usememo
          percentOptions={[]}
        >
          <Stack spacing={4} px={6} pb={4}>
            <Slider value={unstakePercent} onChange={handleUnstakePercentChange}>
              <SliderTrack>
                <SliderFilledTrack bg='blue.500' />
              </SliderTrack>
              <Tooltip label={`${unstakePercent}%`}>
                <SliderThumb boxSize={4} />
              </Tooltip>
            </Slider>
            <Flex width='full' justifyContent='space-between' fontSize='xs' color='text.subtle'>
              <Amount.Fiat value={0} />
              <Amount.Fiat value={stakedAmountFiatUserCurrency} />
            </Flex>
          </Stack>
        </TradeAssetInput>
      </FormControl>
      <CardFooter
        flexDirection='column'
        gap={4}
        bg='background.surface.raised.base'
        borderBottomRadius='xl'
      >
        {isConnected && (
          <Row px={2} fontSize='sm'>
            <Row.Label>{translate('trade.networkFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={!!estimatedFeesData}>
                <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? 0} />
              </Skeleton>
            </Row.Value>
          </Row>
        )}
        <ButtonWalletPredicate
          isValidWallet={true}
          colorScheme={isValid ? 'blue' : 'red'}
          size='lg'
          width='full'
          onClick={handleUnstake}
          isDisabled={isDisabled}
          isLoading={isChainHaltedFetching || isEstimatedFeesDataLoading}
        >
          {confirmCopy}
        </ButtonWalletPredicate>
      </CardFooter>
    </Stack>
  )
}
