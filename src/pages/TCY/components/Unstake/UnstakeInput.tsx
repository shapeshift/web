import { Button, CardFooter, Flex, HStack, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { TCYRouteProps } from '../../types'
import { TCYUnstakeRoute } from '../../types'

import { Amount } from '@/components/Amount/Amount'
import { AmountSlider } from '@/components/AmountSlider'
import { AssetIcon } from '@/components/AssetIcon'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
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

export const UnstakeInput: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const selectedStakingAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const [isFiat, setIsFiat] = useState(false)
  const [cryptoAmount, setCryptoAmount] = useState<string>('')
  const [fiatAmount, setFiatAmount] = useState<string>('')
  const [sliderValue, setSliderValue] = useState(0)
  const [_unstakePercentage, setUnstakePercentage] = useState(0)

  const isLoading = false

  const noop = useCallback(() => {}, [])

  const { price: assetUserCurrencyRate } = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: selectedStakingAsset?.assetId }),
  )

  const handleAmountChange = useCallback(
    (value: string, isFiat?: boolean) => {
      const amountCryptoPrecision = isFiat
        ? bnOrZero(value).div(assetUserCurrencyRate).toFixed()
        : value
      const amountUserCurrency = !isFiat
        ? bnOrZero(value).times(assetUserCurrencyRate).toFixed()
        : value
      setCryptoAmount(amountCryptoPrecision)
      setFiatAmount(amountUserCurrency)
    },
    [assetUserCurrencyRate],
  )

  const handlePercentageSliderChange = useCallback((percentage: number) => {
    setSliderValue(percentage)
  }, [])

  const handlePercentageSliderChangeEnd = useCallback((percentage: number) => {
    setSliderValue(percentage)
    setUnstakePercentage(percentage)
  }, [])

  const tooltipBody = useCallback(
    () => <RawText>{translate('TCY.stakeInput.networkFeeTooltip')}</RawText>,
    [translate],
  )

  const handleUnstake = useCallback(() => {
    navigate(TCYUnstakeRoute.Confirm)
  }, [navigate])

  return (
    <SlideTransition>
      {headerComponent}
      <Stack spacing={4}>
        <AmountSlider
          sliderValue={sliderValue}
          handlePercentageSliderChange={handlePercentageSliderChange}
          handlePercentageSliderChangeEnd={handlePercentageSliderChangeEnd}
          onPercentageClick={handlePercentageSliderChangeEnd}
        >
          <Flex width='full' justifyContent='space-between' fontSize='xs' color='text.subtle'>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Fiat value={0} />
            </Skeleton>
            <Skeleton isLoaded={!isLoading}>
              {/* Actually defined at display time, see isLoaded above */}
              <Amount.Fiat value={0} />
            </Skeleton>
          </Flex>
        </AmountSlider>
        <TradeAssetInput
          assetId={selectedStakingAsset?.assetId ?? ''}
          assetSymbol={selectedStakingAsset?.symbol ?? ''}
          assetIcon={selectedStakingAsset?.icon ?? ''}
          onAccountIdChange={noop}
          label={translate('TCY.stakeInput.amount')}
          isAccountSelectionDisabled
          placeholder={translate('TCY.stakeInput.amountPlaceholder')}
          onToggleIsFiat={setIsFiat}
          onChange={handleAmountChange}
          isFiat={isFiat}
          cryptoAmount={cryptoAmount}
          fiatAmount={fiatAmount}
          percentOptions={percentOptions}
          formControlProps={formControlProps}
          rightComponent={ReadOnlyAsset}
        />
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
          <Button colorScheme='blue' size='lg' width='full' onClick={handleUnstake}>
            {translate('TCY.unstakeInput.unstake')}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
