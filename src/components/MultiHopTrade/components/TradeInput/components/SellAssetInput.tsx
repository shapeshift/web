import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useEffect, useState } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { TradeAssetInputProps } from 'components/MultiHopTrade/components/TradeAssetInput'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import {
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectIsInputtingFiatSellAmount,
  selectMarketDataByFilter,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
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
    const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
    const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
    const [rawSellAmountCryptoPrecision, setRawSellAmountCryptoPrecision] =
      useState(sellAmountCryptoPrecision)
    const [rawSellAmountUserCurrency, setRawSellAmountUserCurrency] =
      useState(sellAmountUserCurrency)
    const debouncedSellAmountCryptoPrecision = useDebounce(rawSellAmountCryptoPrecision, 500)
    const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)

    const dispatch = useAppDispatch()

    const { price: sellAssetUserCurrencyRate } = useAppSelector(state =>
      selectMarketDataByFilter(state, { assetId: asset.assetId }),
    )

    // sync local state with redux on mount only
    useEffect(() => {
      setRawSellAmountCryptoPrecision(sellAmountCryptoPrecision)
      setRawSellAmountUserCurrency(sellAmountUserCurrency ?? '0')
    }, [sellAmountCryptoPrecision, sellAmountUserCurrency])

    // sync redux with local state
    useEffect(() => {
      dispatch(
        tradeInput.actions.setSellAmountCryptoPrecision(
          positiveOrZero(debouncedSellAmountCryptoPrecision).toString(),
        ),
      )
    }, [debouncedSellAmountCryptoPrecision, dispatch])

    const handleSellAssetInputChange = useCallback(
      (value: string, isFiat: boolean | undefined) => {
        const sellAmountCryptoPrecision = isFiat
          ? bnOrZero(value).div(sellAssetUserCurrencyRate).toFixed()
          : value
        const sellAmountUserCurrency = !isFiat
          ? bnOrZero(value).times(sellAssetUserCurrencyRate).toFixed()
          : value
        setRawSellAmountCryptoPrecision(sellAmountCryptoPrecision)
        setRawSellAmountUserCurrency(sellAmountUserCurrency)
      },
      [sellAssetUserCurrencyRate],
    )

    const handleIsInputtingFiatSellAmountChange = useCallback(
      (isInputtingFiatSellAmount: boolean) => {
        dispatch(tradeInput.actions.setIsInputtingFiatSellAmount(isInputtingFiatSellAmount))
      },
      [dispatch],
    )

    return (
      <TradeAssetInput
        accountId={accountId}
        assetId={asset.assetId}
        assetSymbol={asset.symbol}
        assetIcon={asset.icon}
        cryptoAmount={rawSellAmountCryptoPrecision}
        fiatAmount={rawSellAmountUserCurrency}
        isFiat={isInputtingFiatSellAmount}
        onToggleIsFiat={handleIsInputtingFiatSellAmountChange}
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
