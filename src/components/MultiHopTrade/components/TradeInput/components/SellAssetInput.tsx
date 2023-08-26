import type { AccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useEffect, useState } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { TradeAssetInputProps } from 'components/MultiHopTrade/components/TradeAssetInput'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import type { Asset } from 'lib/asset-service'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataByFilter } from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const formControlProps = { borderRadius: 0, background: 'transparent', borderWidth: 0 }

export type SellAssetInputProps = {
  accountId?: AccountId
  label: string
  asset: Asset
  onAccountIdChange: AccountDropdownProps['onChange']
  labelPostFix?: TradeAssetInputProps['labelPostFix']
}

const percentOptions = [1]

export const SellAssetInput = memo(
  ({ accountId, asset, label, onAccountIdChange, ...rest }: SellAssetInputProps) => {
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
        cryptoAmount={positiveOrZero(sellAmountCryptoPrecision).toString()}
        fiatAmount={positiveOrZero(sellAmountUserCurrencyHuman).toString()}
        isSendMaxDisabled={false}
        onChange={handleSellAssetInputChange}
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={label}
        formControlProps={formControlProps}
        onAccountIdChange={onAccountIdChange}
        {...rest}
      />
    )
  },
)
