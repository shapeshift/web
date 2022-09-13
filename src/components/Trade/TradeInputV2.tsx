import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, IconButton, Stack, useColorModeValue } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { SlideTransition } from 'components/SlideTransition'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import { getSendMaxAmount } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperService } from 'components/Trade/hooks/useSwapperService'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoBalanceByFilter } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

import { RateGasRow } from './Components/RateGasRow'
import type { TradeAssetInputProps } from './Components/TradeAssetInput'
import { TradeAssetInput } from './Components/TradeAssetInput'
import { ReceiveSummary } from './TradeConfirm/ReceiveSummary'
import { type TradeState, TradeAmountInputField, TradeRoutePaths } from './types'

const moduleLogger = logger.child({ namespace: ['TradeInput'] })

export const TradeInput = () => {
  useSwapperService()
  const { setTradeAmounts } = useTradeAmounts()
  const { checkApprovalNeeded, getTrade } = useSwapper()
  const history = useHistory()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const {
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { isValid },
  } = useFormContext<TradeState<KnownChainIds>>()

  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const quote = useWatch({ control, name: 'quote' })
  const feeAssetFiatRate = useWatch({ control, name: 'feeAssetFiatRate' })
  const fees = useWatch({ control, name: 'fees' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const fiatSellAmount = useWatch({ control, name: 'fiatSellAmount' })
  const fiatBuyAmount = useWatch({ control, name: 'fiatBuyAmount' })

  const translate = useTranslate()

  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAsset?.asset?.assetId ?? ethAssetId),
  )
  const sellAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, {
      accountId: sellAssetAccountId,
      assetId: sellTradeAsset?.asset?.assetId ?? '',
    }),
  )

  // Initialize the trade input fields with the default values of '0'
  useEffect(() => {
    const initialAmount = '0'
    setValue('amount', initialAmount)
    setValue('fiatSellAmount', initialAmount)
    setValue('fiatBuyAmount', initialAmount)
    setValue('sellTradeAsset.amount', initialAmount)
    setValue('buyTradeAsset.amount', initialAmount)
  }, [setValue])

  const protocolFee = fromBaseUnit(bnOrZero(fees?.tradeFee), buyTradeAsset?.asset?.precision ?? 0)
  const toCryptoAmountAfterFees = bnOrZero(buyTradeAsset?.amount).minus(bnOrZero(protocolFee))

  const handleInputChange = (action: TradeAmountInputField, amount: string) => {
    setValue('amount', amount)
    setValue('action', action)
    setTradeAmounts({ amount, action })
  }

  const handleToggle = () => {
    try {
      const currentSellTradeAsset = getValues('sellTradeAsset')
      const currentBuyTradeAsset = getValues('buyTradeAsset')
      if (!(currentSellTradeAsset?.asset && currentBuyTradeAsset?.asset)) return
      setValue('sellTradeAsset', currentBuyTradeAsset)
      setValue('buyTradeAsset', currentSellTradeAsset)
    } catch (e) {
      moduleLogger.error(e, 'handleToggle error')
    }
  }

  const handleSendMax: TradeAssetInputProps['onMaxClick'] = () => {
    if (!(sellTradeAsset?.asset && quote)) return
    const maxSendAmount = getSendMaxAmount(
      sellTradeAsset.asset,
      sellFeeAsset,
      quote,
      sellAssetBalance,
    )
    setValue('action', TradeAmountInputField.SELL_CRYPTO)
    setValue('sellTradeAsset.amount', maxSendAmount)
    setValue('amount', maxSendAmount)

    setTradeAmounts({ amount: maxSendAmount, action: TradeAmountInputField.SELL_CRYPTO })
  }

  const onSubmit = async (values: TradeState<KnownChainIds>) => {
    moduleLogger.info(values, 'debugging logger')
    try {
      const isApproveNeeded = await checkApprovalNeeded()
      if (isApproveNeeded) {
        history.push({ pathname: TradeRoutePaths.Approval, state: { fiatRate: feeAssetFiatRate } })
        return
      }
      const trade = await getTrade()
      setValue('trade', trade)
      history.push({ pathname: TradeRoutePaths.Confirm, state: { fiatRate: feeAssetFiatRate } })
    } catch (e) {
      moduleLogger.error(e, 'onSubmit error')
    }
  }

  const onSellAssetInputChange: TradeAssetInputProps['onChange'] = (value, isFiat) => {
    const action = isFiat ? TradeAmountInputField.SELL_FIAT : TradeAmountInputField.SELL_CRYPTO
    handleInputChange(action, value)
  }

  const onBuyAssetInputChange: TradeAssetInputProps['onChange'] = (value, isFiat) => {
    const action = isFiat ? TradeAmountInputField.BUY_FIAT : TradeAmountInputField.BUY_CRYPTO
    handleInputChange(action, value)
  }

  const handleSellAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    setValue('selectedSellAssetAccountId', accountId)

  const handleBuyAccountIdChange: AccountDropdownProps['onChange'] = accountId =>
    setValue('selectedBuyAssetAccountId', accountId)

  return (
    <SlideTransition>
      <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={0}>
          <TradeAssetInput
            assetId={sellTradeAsset?.asset?.assetId}
            assetSymbol={sellTradeAsset?.asset?.symbol ?? ''}
            assetIcon={sellTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={sellTradeAsset?.amount}
            fiatAmount={fiatSellAmount}
            isSendMaxDisabled={!quote}
            onChange={onSellAssetInputChange}
            percentOptions={[1]}
            onMaxClick={handleSendMax}
            onAssetClick={() => history.push(TradeRoutePaths.SellSelect)}
            onAccountIdChange={handleSellAccountIdChange}
          />
          <Stack justifyContent='center' alignItems='center'>
            <IconButton
              onClick={handleToggle}
              isRound
              my={-3}
              size='sm'
              position='relative'
              borderColor={useColorModeValue('gray.100', 'gray.750')}
              borderWidth={1}
              boxShadow={`0 0 0 3px var(${useColorModeValue(
                '--chakra-colors-white',
                '--chakra-colors-gray-785',
              )})`}
              bg={useColorModeValue('white', 'gray.850')}
              zIndex={1}
              aria-label='Switch Assets'
              icon={<ArrowDownIcon />}
            />
          </Stack>
          <TradeAssetInput
            assetId={buyTradeAsset?.asset?.assetId}
            assetSymbol={buyTradeAsset?.asset?.symbol ?? ''}
            assetIcon={buyTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={buyTradeAsset?.amount}
            fiatAmount={fiatBuyAmount}
            onChange={onBuyAssetInputChange}
            percentOptions={[1]}
            onAssetClick={() => history.push(TradeRoutePaths.BuySelect)}
            onAccountIdChange={handleBuyAccountIdChange}
          />
        </Stack>
        <Stack boxShadow='sm' p={4} borderColor={borderColor} borderRadius='xl' borderWidth={1}>
          <RateGasRow
            sellSymbol={sellTradeAsset?.asset?.symbol}
            buySymbol={buyTradeAsset?.asset?.symbol}
            gasFee={bnOrZero(fees?.fee).times(bnOrZero(feeAssetFiatRate)).toString()}
            rate={quote?.rate}
          />
          <ReceiveSummary
            isLoading={!quote}
            symbol={buyTradeAsset?.asset?.symbol ?? ''}
            amount={toCryptoAmountAfterFees.toString()}
            beforeFees={buyTradeAsset?.amount ?? ''}
            protocolFee={protocolFee}
            shapeShiftFee='0'
            minAmountAfterSlippage={buyTradeAsset?.amount ?? ''}
          />
        </Stack>
        <Button type='submit' colorScheme='blue' size='lg' isDisabled={!isValid}>
          {translate('trade.previewTrade')}
        </Button>
      </Stack>
    </SlideTransition>
  )
}
