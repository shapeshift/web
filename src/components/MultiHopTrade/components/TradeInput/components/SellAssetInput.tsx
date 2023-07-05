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
  const [sellAmountFiatHuman, setSellAmountFiatHuman] = useState('0')
  const [sellAmountCryptoPrecision, setSellAmountCryptoPrecision] = useState('0')
  const dispatch = useAppDispatch()

  const { price: sellAssetFiatRate } = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: asset.assetId }),
  )

  const handleSellAssetInputChange = useCallback(
    (value: string, isFiat: boolean | undefined) => {
      const sellAmountFiatHuman = isFiat
        ? value
        : bnOrZero(value).times(sellAssetFiatRate).toFixed(2)
      const sellAmountCryptoPrecision = isFiat
        ? bnOrZero(value).div(sellAssetFiatRate).toFixed()
        : value
      setSellAmountFiatHuman(sellAmountFiatHuman)
      setSellAmountCryptoPrecision(sellAmountCryptoPrecision)
      dispatch(swappers.actions.setSellAmountCryptoPrecision(sellAmountCryptoPrecision))
    },
    [dispatch, sellAssetFiatRate],
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
      fiatAmount={sellAmountFiatHuman}
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
