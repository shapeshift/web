import { Button, CardFooter, HStack, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
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

export const StakeInput: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const selectedStakingAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const [isFiat, setIsFiat] = useState(false)
  const [cryptoAmount, setCryptoAmount] = useState<string>('')
  const [fiatAmount, setFiatAmount] = useState<string>('')

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

  const tooltipBody = useCallback(
    () => <RawText>{translate('TCY.stakeInput.networkFeeTooltip')}</RawText>,
    [translate],
  )

  const handleStake = useCallback(() => {
    navigate(TCYStakeRoute.Confirm)
  }, [navigate])

  return (
    <Stack>
      {headerComponent}
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
        <Button colorScheme='blue' size='lg' width='full' onClick={handleStake}>
          {translate('TCY.stakeInput.stake')}
        </Button>
      </CardFooter>
    </Stack>
  )
}
