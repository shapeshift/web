import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useState } from 'react'
import { TradeAssetInput } from 'components/Trade/Components/TradeAssetInput'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataByFilter } from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export type SellAssetInputProps = {
  accountId?: AccountId
  label: string
  asset: Asset
  onClickSendMax: () => void
}

export const SellAssetInput = ({
  accountId,
  asset,
  label,
  onClickSendMax,
}: SellAssetInputProps) => {
  const [sellAmountUserCurrencyHuman, setSellAmountUserCurrencyHuman] = useState('0')
  const [sellAmountCryptoPrecision, setSellAmountCryptoPrecision] = useState('0')
  const dispatch = useAppDispatch()

  const { price: sellAssetUserCurrencyRate } = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: asset.assetId }),
  )

  const handleSellAssetInputChange = useCallback(
    (value: string, isFiat: boolean | undefined) => {
      const sellAmountUserCurrencyHuman = isFiat
        ? value
        : bnOrZero(value).times(sellAssetUserCurrencyRate).toFixed(2)
      const sellAmountCryptoPrecision = isFiat
        ? bnOrZero(value).div(sellAssetUserCurrencyRate).toFixed()
        : value
      setSellAmountUserCurrencyHuman(sellAmountUserCurrencyHuman)
      setSellAmountCryptoPrecision(sellAmountCryptoPrecision)
      dispatch(swappers.actions.setSellAmountCryptoPrecision(sellAmountCryptoPrecision))
    },
    [dispatch, sellAssetUserCurrencyRate],
  )

  useEffect(() => {
    handleSellAssetInputChange('0', undefined)
  }, [asset, handleSellAssetInputChange])

  return (
    <TradeAssetInput
      accountId={accountId}
      assetId={asset.assetId}
      assetSymbol={asset.symbol}
      assetIcon={asset.icon}
      cryptoAmount={sellAmountCryptoPrecision}
      fiatAmount={sellAmountUserCurrencyHuman}
      isSendMaxDisabled={false}
      onChange={handleSellAssetInputChange}
      percentOptions={[1]}
      onPercentOptionClick={onClickSendMax}
      showInputSkeleton={false}
      showFiatSkeleton={false}
      label={label}
    />
  )
}
