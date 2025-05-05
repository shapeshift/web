import { Button, Card, CardFooter, FormControl, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'
import type { StakeFormValues } from './Stake'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { toBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoPrecisionBalanceByFilter } from '@/state/slices/common-selectors'
import { selectMarketDataByFilter } from '@/state/slices/marketDataSlice/selectors'
import { selectAccountIdByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

const percentOptions = [1]
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

export const StakeInput: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const selectedStakingAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const {
    register,
    setValue,
    formState: { errors, isValid },
  } = useFormContext<StakeFormValues>()
  const [fieldName, setFieldName] = useState<AmountFieldName>('amountCryptoPrecision')

  const amountCryptoPrecision = useWatch<StakeFormValues, 'amountCryptoPrecision'>({
    name: 'amountCryptoPrecision',
  })
  const fiatAmount = useWatch<StakeFormValues, 'fiatAmount'>({
    name: 'fiatAmount',
  })

  const { price: assetUserCurrencyRate } = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: selectedStakingAsset?.assetId }),
  )

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )
  const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
  const accountId = accountNumberAccounts?.[thorchainChainId]

  const balanceFilter = useMemo(() => ({ assetId: tcyAssetId, accountId }), [accountId])

  const balanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, balanceFilter),
  )

  const amountCryptoBaseUnit = useMemo(
    () => toBaseUnit(amountCryptoPrecision, THOR_PRECISION),
    [amountCryptoPrecision],
  )

  const { estimatedFeesData, isEstimatedFeesDataLoading, isEstimatedFeesDataError } = useSendThorTx(
    {
      accountId: accountId ?? '',
      action: 'stakeTcy',
      amountCryptoBaseUnit,
      assetId: tcyAssetId,
      memo: 'tcy+',
      fromAddress: null,
      enableEstimateFees: Boolean(accountId && bnOrZero(amountCryptoPrecision).gt(0)),
    },
  )

  const handleAmountChange = useCallback(
    (inputValue: string) => {
      if (inputValue === '') {
        setValue('amountCryptoPrecision', '')
        setValue('fiatAmount', '')
        return
      }

      const price = assetUserCurrencyRate ?? 0
      const cryptoAmount = fieldName === 'fiatAmount' ? bnOrZero(inputValue).div(price) : inputValue
      const fiatAmount = fieldName === 'fiatAmount' ? inputValue : bnOrZero(inputValue).times(price)

      setValue('amountCryptoPrecision', cryptoAmount.toString())
      setValue('fiatAmount', fiatAmount.toString())
    },
    [fieldName, setValue, assetUserCurrencyRate],
  )

  const toggleIsFiat = useCallback(() => {
    setFieldName(fieldName === 'fiatAmount' ? 'amountCryptoPrecision' : 'fiatAmount')
  }, [fieldName])

  const tooltipBody = useCallback(
    () => <RawText>{translate('TCY.stakeInput.networkFeeTooltip')}</RawText>,
    [translate],
  )

  const handleStake = useCallback(() => {
    navigate(TCYStakeRoute.Confirm)
  }, [navigate])

  register('amountCryptoPrecision', {
    validate: (value: string) => {
      // TODO(gomes): dev only, this works but we obviously don't want this until we can hold TCY
      return true
      if (bnOrZero(value).gt(bnOrZero(balanceCryptoPrecision))) {
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
    !fiatAmount

  const confirmCopy = useMemo(() => {
    if (errors.amountCryptoPrecision) return errors.amountCryptoPrecision.message
    return translate('TCY.stakeInput.stake')
  }, [errors.amountCryptoPrecision, translate])

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
          label={translate('TCY.stakeInput.amount')}
          isAccountSelectionDisabled
          placeholder={translate('TCY.stakeInput.amountPlaceholder')}
          onToggleIsFiat={toggleIsFiat}
          onChange={handleAmountChange}
          isFiat={fieldName === 'fiatAmount'}
          cryptoAmount={amountCryptoPrecision}
          fiatAmount={fiatAmount}
          percentOptions={percentOptions}
          formControlProps={formControlProps}
          rightComponent={ReadOnlyAsset}
        />
      </FormControl>
      <CardFooter
        borderTopWidth={1}
        bg='background.surface.raised.accent'
        borderColor='border.subtle'
        flexDir='column'
        borderBottomRadius='xl'
        gap={4}
        px={4}
        py={4}
      >
        <Row px={2} fontSize='sm' Tooltipbody={tooltipBody}>
          <Row.Label>{translate('TCY.stakeInput.networkFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!!estimatedFeesData}>
              <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? 0} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Button
          colorScheme={isValid ? 'blue' : 'red'}
          size='lg'
          width='full'
          onClick={handleStake}
          isDisabled={isDisabled}
          isLoading={isEstimatedFeesDataLoading}
        >
          {confirmCopy}
        </Button>
      </CardFooter>
    </Stack>
  )
}
