import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, IconButton, Stack, useColorModeValue } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { SlideTransition } from 'components/SlideTransition'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import { getSendMaxAmount } from 'components/Trade/hooks/useSwapper/utils'
import { useSwapperService } from 'components/Trade/services/useSwapperService'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
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

  const { field: sellAmountCrypto } = useController({
    name: 'sellTradeAsset.amount',
    control,
    rules: { required: true },
  })
  const { field: sellAmountFiat } = useController({
    name: 'fiatSellAmount',
    control,
    rules: { required: true },
  })

  const { field: buyAmountFiat } = useController({
    name: 'fiatBuyAmount',
    control,
    rules: { required: true },
  })

  const { field: buyAmountCrypto } = useController({
    name: 'buyTradeAsset.amount',
    control,
    rules: { required: true },
  })

  const toCryptoAmountAfterFees = bnOrZero(buyAmountCrypto?.value).minus(bnOrZero(fees?.tradeFee))

  const handleInputChange = (action: TradeAmountInputField, amount: string) => {
    setValue('amount', amount)
    setValue('action', action)
  }

  const handleToggle = () => {
    try {
      const currentSellTradeAsset = getValues('sellTradeAsset')
      const currentBuyTradeAsset = getValues('buyTradeAsset')
      if (!(currentSellTradeAsset?.asset && currentBuyTradeAsset?.asset)) return
      setValue('sellTradeAsset', currentBuyTradeAsset)
      setValue('buyTradeAsset', currentSellTradeAsset)
      setValue('action', TradeAmountInputField.SELL_CRYPTO)
      setValue('amount', bnOrZero(currentBuyTradeAsset.amount).toString())
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
    if (isFiat) {
      sellAmountFiat.onChange(value)
    } else {
      sellAmountCrypto.onChange(value)
    }
    handleInputChange(action, value)
  }

  const onBuyAssetInputChange: TradeAssetInputProps['onChange'] = (value, isFiat) => {
    const action = isFiat ? TradeAmountInputField.BUY_FIAT : TradeAmountInputField.BUY_CRYPTO
    buyAmountCrypto.onChange(value)
    if (isFiat) {
      buyAmountFiat.onChange(value)
    } else {
      buyAmountCrypto.onChange(value)
    }
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
            cryptoAmount={sellAmountCrypto?.value}
            fiatAmount={sellAmountFiat.value}
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
            cryptoAmount={buyAmountCrypto?.value}
            fiatAmount={buyAmountFiat.value}
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
            beforeFees={buyAmountCrypto?.value ?? ''}
            protocolFee={fees?.tradeFee}
            shapeShiftFee='0'
            minAmountAfterSlippage={buyAmountCrypto?.value ?? ''}
          />
        </Stack>
        <Button type='submit' colorScheme='blue' size='lg' isDisabled={!isValid}>
          {translate('trade.previewTrade')}
        </Button>
      </Stack>
    </SlideTransition>
  )
}
