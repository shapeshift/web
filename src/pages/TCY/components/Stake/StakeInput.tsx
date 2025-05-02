import { Button, Card, CardFooter, FormControl, HStack, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
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
    watch,
    formState: { errors, isValid },
  } = useFormContext<StakeFormValues>()

  const amount = watch('amount')

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

  const handleAmountChange = useCallback(
    (value: string, isFiat?: boolean) => {
      const amountCryptoPrecision = isFiat
        ? bnOrZero(value).div(assetUserCurrencyRate).toFixed()
        : value
      setValue('amount', amountCryptoPrecision, { shouldValidate: true })
    },
    [assetUserCurrencyRate, setValue],
  )

  const tooltipBody = useCallback(
    () => <RawText>{translate('TCY.stakeInput.networkFeeTooltip')}</RawText>,
    [translate],
  )

  const handleStake = useCallback(() => {
    navigate(TCYStakeRoute.Confirm)
  }, [navigate])

  register('amount', {
    validate: (value: string) => {
      // TODO(gomes): dev only, this works but we obviously don't want this until we can hold TCY
      return true
      if (bnOrZero(value).gt(bnOrZero(balanceCryptoPrecision))) {
        return translate('common.insufficientFunds')
      }
      return true
    },
  })

  const isDisabled = !isValid || bnOrZero(amount).isZero()

  const confirmCopy = useMemo(() => {
    if (errors.amount) return errors.amount.message
    return translate('TCY.stakeInput.stake')
  }, [amount, errors.amount, assetUserCurrencyRate, translate])

  useEffect(() => {
    setValue('accountId', accountId ?? '')
  }, [accountId, setValue])

  return (
    <Stack>
      {headerComponent}
      <FormControl isInvalid={Boolean(errors.amount)}>
        <TradeAssetInput
          assetId={selectedStakingAsset?.assetId ?? ''}
          assetSymbol={selectedStakingAsset?.symbol ?? ''}
          assetIcon={selectedStakingAsset?.icon ?? ''}
          onAccountIdChange={() => {}}
          label={translate('TCY.stakeInput.amount')}
          isAccountSelectionDisabled
          placeholder={translate('TCY.stakeInput.amountPlaceholder')}
          onToggleIsFiat={() => {}}
          onChange={handleAmountChange}
          isFiat={false}
          cryptoAmount={amount}
          fiatAmount={bnOrZero(amount).times(assetUserCurrencyRate).toFixed()}
          percentOptions={percentOptions}
          formControlProps={formControlProps}
          rightComponent={ReadOnlyAsset}
        />
      </FormControl>
      <Card>
        <CardFooter
          flexDirection='column'
          gap={4}
          bg='background.surface.raised.base'
          borderBottomRadius='xl'
        >
          <Row fontSize='sm' Tooltipbody={tooltipBody}>
            <Row.Label>{translate('TCY.stakeInput.networkFee')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value={0} />
            </Row.Value>
          </Row>
          <Button
            colorScheme={isValid ? 'blue' : 'red'}
            size='lg'
            width='full'
            onClick={handleStake}
            isDisabled={isDisabled}
          >
            {confirmCopy}
          </Button>
        </CardFooter>
      </Card>
    </Stack>
  )
}
