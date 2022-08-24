import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, IconButton, Stack, useColorModeValue } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RateGasRow } from './Components/RateGasRow'
import { TradeAssetInput } from './Components/TradeAssetInput'
import { useSwapper } from './hooks/useSwapper/useSwapper'
import { ReceiveSummary } from './TradeConfirm/ReceiveSummary'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from './types'

export const TradeInput = () => {
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

  const { updateQuote, updateTrade, checkApprovalNeeded } = useSwapper()

  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const { field: sellCryptoAmount } = useController({
    name: 'sellTradeAsset.amount',
    control,
    rules: { required: true },
  })
  const { field: sellFiatAmount } = useController({
    name: 'fiatSellAmount',
    control,
    rules: { required: true },
  })

  const { field: buyCryptoAmount } = useController({
    name: 'buyTradeAsset.amount',
    control,
    rules: { required: true },
  })

  const handleInputChange = (action: TradeAmountInputField, amount: string) => {
    setValue('amount', amount)
    setValue('action', action)
  }

  const handleToggle = () => {
    try {
      const currentSellAsset = getValues('sellTradeAsset')
      const currentBuyAsset = getValues('buyTradeAsset')
      if (!(currentSellAsset?.asset && currentBuyAsset?.asset)) return
      setValue('sellTradeAsset', currentBuyAsset)
      setValue('buyTradeAsset', currentSellAsset)
      updateQuote({
        forceQuote: true,
        amount: bnOrZero(currentBuyAsset.amount).toString(),
        sellAsset: currentBuyAsset.asset,
        buyAsset: currentSellAsset.asset,
        action: TradeAmountInputField.SELL,
        selectedCurrencyToUsdRate,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const onSubmit = async (values: TradeState<KnownChainIds>) => {
    console.info(values)
    try {
      const approveNeeded = await checkApprovalNeeded()
      if (approveNeeded) {
        history.push({ pathname: TradeRoutePaths.Approval, state: { fiatRate: feeAssetFiatRate } })
        return
      }
      await updateTrade({
        sellAsset: values.quote.sellAsset,
        buyAsset: values.quote.buyAsset,
        amount: values.quote.sellAmount,
      })
      history.push({ pathname: TradeRoutePaths.Confirm, state: { fiatRate: feeAssetFiatRate } })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <SlideTransition>
      <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={0}>
          <TradeAssetInput
            assetId={sellTradeAsset?.asset?.assetId as AssetId}
            assetSymbol={sellTradeAsset?.asset?.symbol ?? ''}
            assetIcon={sellTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={sellCryptoAmount?.value}
            fiatAmount={sellFiatAmount.value}
            onChange={value => {
              sellCryptoAmount.onChange(value)
              handleInputChange(TradeAmountInputField.SELL, value)
            }}
            percentOptions={[1]}
            onMaxClick={() => console.info('max')}
            onAssetClick={() => history.push(TradeRoutePaths.SellSelect)}
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
            assetId={buyTradeAsset?.asset?.assetId as AssetId}
            assetSymbol={buyTradeAsset?.asset?.symbol ?? ''}
            assetIcon={buyTradeAsset?.asset?.icon ?? ''}
            cryptoAmount={buyCryptoAmount?.value}
            onChange={value => {
              buyCryptoAmount.onChange(value)
              handleInputChange(TradeAmountInputField.BUY, value)
            }}
            percentOptions={[1]}
            onAssetClick={() => history.push(TradeRoutePaths.BuySelect)}
          ></TradeAssetInput>
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
            amount={buyCryptoAmount?.value ?? ''}
            beforeFees='100'
            protocolFee='10'
            shapeShiftFee='0'
            minAmountAfterSlippage={buyCryptoAmount?.value ?? ''}
          />
        </Stack>
        <Button type='submit' colorScheme='blue' size='lg' isDisabled={!isValid}>
          Preview Trade
        </Button>
      </Stack>
    </SlideTransition>
  )
}
