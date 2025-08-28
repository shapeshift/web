import { CardFooter, FormControl, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import type { CurrentAccount } from '../../tcy'
import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'
import type { StakeFormValues } from './Stake'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { toBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useIsChainHalted } from '@/lib/utils/thorchain/hooks/useIsChainHalted'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoPrecisionBalanceByFilter } from '@/state/slices/common-selectors'
import { selectMarketDataByFilter } from '@/state/slices/marketDataSlice/selectors'
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

export const StakeInput: React.FC<TCYRouteProps & { currentAccount: CurrentAccount }> = ({
  headerComponent,
  currentAccount,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const {
    state: { isConnected },
  } = useWallet()

  const selectedStakingAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const { isChainHalted, isFetching: isChainHaltedFetching } = useIsChainHalted(thorchainChainId)
  const {
    register,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useFormContext<StakeFormValues>()
  const [fieldName, setFieldName] = useState<AmountFieldName>('amountCryptoPrecision')

  const amountCryptoPrecision = useWatch<StakeFormValues, 'amountCryptoPrecision'>({
    name: 'amountCryptoPrecision',
  })
  const fiatAmount = useWatch<StakeFormValues, 'fiatAmount'>({
    name: 'fiatAmount',
  })

  const { price: assetUserCurrencyRate } =
    useAppSelector(state =>
      selectMarketDataByFilter(state, { assetId: selectedStakingAsset?.assetId }),
    ) ?? {}

  const { accountId } = currentAccount

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
    async (inputValue: string) => {
      if (inputValue === '') {
        setValue('amountCryptoPrecision', '')
        setValue('fiatAmount', '')
        await trigger('amountCryptoPrecision')
        return
      }

      const price = assetUserCurrencyRate ?? 0
      const cryptoAmount = fieldName === 'fiatAmount' ? bnOrZero(inputValue).div(price) : inputValue
      const fiatAmount =
        fieldName === 'fiatAmount' ? inputValue : bnOrZero(inputValue).times(bnOrZero(price))

      setValue('amountCryptoPrecision', cryptoAmount.toString())
      setValue('fiatAmount', fiatAmount.toString())
      await trigger('amountCryptoPrecision')
    },
    [fieldName, setValue, assetUserCurrencyRate, trigger],
  )

  const toggleIsFiat = useCallback(() => {
    setFieldName(fieldName === 'fiatAmount' ? 'amountCryptoPrecision' : 'fiatAmount')
  }, [fieldName])

  const handleStake = useCallback(() => {
    navigate(TCYStakeRoute.Confirm)
  }, [navigate])

  register('amountCryptoPrecision', {
    validate: (value: string) => {
      if (!value) return true
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
    !fiatAmount ||
    isChainHalted

  const confirmCopy = useMemo(() => {
    if (isChainHalted) return translate('common.chainHalted')
    if (errors.amountCryptoPrecision) return errors.amountCryptoPrecision.message
    return translate('TCY.stakeInput.stake')
  }, [errors.amountCryptoPrecision, translate, isChainHalted])

  useEffect(() => {
    setValue('accountId', accountId ?? '')
  }, [accountId, setValue])

  return (
    <Stack>
      {headerComponent}
      <FormControl isInvalid={Boolean(errors.amountCryptoPrecision)}>
        <TradeAssetInput
          accountId={accountId}
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
        {!bnOrZero(amountCryptoPrecision).isZero() && isConnected && (
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
          onClick={handleStake}
          isDisabled={isDisabled}
          isLoading={isChainHaltedFetching || isEstimatedFeesDataLoading}
        >
          {confirmCopy}
        </ButtonWalletPredicate>
      </CardFooter>
    </Stack>
  )
}
