import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { TradeAssetInputProps } from 'components/MultiHopTrade/components/TradeAssetInput'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
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
  percentOptions: number[]
}

export const SellAssetInput = memo(
  ({
    accountId,
    asset,
    label,
    onAccountIdChange,
    percentOptions,
    ...rest
  }: SellAssetInputProps) => {
    const [sellAmountUserCurrencyHuman, setSellAmountUserCurrencyHuman] = useState('0')
    const [sellAmountCryptoPrecision, setSellAmountCryptoPrecision] = useState('0')
    const dispatch = useAppDispatch()

    const { price: sellAssetUserCurrencyRate } = useAppSelector(state =>
      selectMarketDataByFilter(state, { assetId: asset.assetId }),
    )

    // this is separated from handleSellAssetInputChange to prevent resetting the input value to 0
    // when the market data changes between keystrokes
    const handleSellAssetInputChangeInner = useCallback(
      (sellAmountUserCurrencyHuman: string, sellAmountCryptoPrecision: string) => {
        setSellAmountUserCurrencyHuman(sellAmountUserCurrencyHuman)
        setSellAmountCryptoPrecision(sellAmountCryptoPrecision)

        dispatch(
          swappers.actions.setSellAmountCryptoPrecision(
            positiveOrZero(sellAmountCryptoPrecision).toString(),
          ),
        )
      },
      [dispatch],
    )

    const handleSellAssetInputChange = useCallback(
      (value: string, isFiat: boolean | undefined) => {
        const sellAmountUserCurrencyHuman = isFiat
          ? value
          : bnOrZero(value).times(sellAssetUserCurrencyRate).toFixed(2)
        const sellAmountCryptoPrecision = isFiat
          ? bnOrZero(value).div(sellAssetUserCurrencyRate).toFixed()
          : value
        handleSellAssetInputChangeInner(sellAmountUserCurrencyHuman, sellAmountCryptoPrecision)
      },
      [handleSellAssetInputChangeInner, sellAssetUserCurrencyRate],
    )

    // reset the input value to 0 when the asset changes
    useEffect(() => {
      handleSellAssetInputChangeInner('0', '0')
    }, [asset, handleSellAssetInputChangeInner])

    // Allow decimals to be entered in the form of . as the first character
    const cryptoAmount = useMemo(() => {
      if (sellAmountCryptoPrecision === '.') return sellAmountCryptoPrecision
      return positiveOrZero(sellAmountCryptoPrecision).toString()
    }, [sellAmountCryptoPrecision])

    const fiatAmount = useMemo(() => {
      if (sellAmountUserCurrencyHuman === '.') return sellAmountUserCurrencyHuman
      return positiveOrZero(sellAmountUserCurrencyHuman).toString()
    }, [sellAmountUserCurrencyHuman])

    return (
      <TradeAssetInput
        accountId={accountId}
        assetId={asset.assetId}
        assetSymbol={asset.symbol}
        assetIcon={asset.icon}
        cryptoAmount={cryptoAmount}
        fiatAmount={fiatAmount}
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
