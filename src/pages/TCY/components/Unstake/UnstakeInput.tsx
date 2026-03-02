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
import { BigAmount, bnOrZero, convertPercentageToBasisPoints } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
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
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
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
  'use no memo'
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
  const [selectedUnstakePercent, setSelectedUnstakePercent] = useState<number | undefined>(
    undefined,
  )

  const currentUnstakePercent = selectedUnstakePercent ?? 100

  const { price: assetUserCurrencyRate = '0' } =
    useAppSelector(state =>
      selectMarketDataByFilter(state, { assetId: selectedStakingAsset?.assetId }),
    ) ?? {}

  const { accountId } = currentAccount

  const { data: tcyStaker } = useTcyStaker(accountId)

  const stakedAmountCryptoPrecision = useMemo(
    () => BigAmount.fromThorBaseUnit(tcyStaker?.amount ?? 0).toPrecision(),
    [tcyStaker?.amount],
  )

  const stakedAmountFiatUserCurrency = useMemo(
    () => bn(stakedAmountCryptoPrecision).times(assetUserCurrencyRate).toFixed(2),
    [stakedAmountCryptoPrecision, assetUserCurrencyRate],
  )

  const amountCryptoPrecision = useMemo(
    () => bnOrZero(stakedAmountCryptoPrecision).times(currentUnstakePercent).div(100).toFixed(),
    [stakedAmountCryptoPrecision, currentUnstakePercent],
  )

  const fiatAmount = useMemo(
    () => bnOrZero(amountCryptoPrecision).times(assetUserCurrencyRate).toFixed(2),
    [amountCryptoPrecision, assetUserCurrencyRate],
  )

  const withdrawBps = useMemo(
    () => convertPercentageToBasisPoints(currentUnstakePercent).toFixed(0),
    [currentUnstakePercent],
  )

  const handleUnstakePercentChange = useCallback((value: number) => {
    setSelectedUnstakePercent(value)
  }, [])

  useEffect(() => {
    setValue('amountCryptoPrecision', amountCryptoPrecision)
    setValue('fiatAmount', fiatAmount)
    setValue('unstakePercent', currentUnstakePercent)
  }, [amountCryptoPrecision, fiatAmount, currentUnstakePercent, setValue])

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
      if (
        bnOrZero(value).gt(
          BigAmount.fromBaseUnit({
            value: tcyStaker?.amount,
            precision: THOR_PRECISION,
          }).toPrecision(),
        )
      ) {
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
    <Stack data-testid='tcy-unstake-input'>
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
          onChange={noop}
          isFiat={fieldName === 'fiatAmount'}
          cryptoAmount={amountCryptoPrecision}
          fiatAmount={fiatAmount}
          isReadOnly
          isAccountSelectionHidden
          formControlProps={formControlProps}
          rightComponent={ReadOnlyAsset}
          percentOptions={[]}
        >
          <Stack spacing={4} px={6} pb={4}>
            <Slider value={currentUnstakePercent} onChange={handleUnstakePercentChange}>
              <SliderTrack>
                <SliderFilledTrack bg='blue.500' />
              </SliderTrack>
              <Tooltip label={`${currentUnstakePercent}%`}>
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
