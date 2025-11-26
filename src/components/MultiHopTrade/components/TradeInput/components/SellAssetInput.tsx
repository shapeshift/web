import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useEffect, useState } from 'react'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import type { TradeAssetInputProps } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { bnOrZero, positiveOrZero } from '@/lib/bignumber/bignumber'
import { selectMarketDataByFilter } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const formControlProps = { borderRadius: 0, background: 'transparent', borderWidth: 0 }

export type SellAssetInputProps = {
  accountId?: AccountId
  asset: Asset
  isInputtingFiatSellAmount: boolean
  isLoading?: boolean
  isReadOnly?: TradeAssetInputProps['isReadOnly']
  label: string
  labelPostFix?: TradeAssetInputProps['labelPostFix']
  percentOptions: number[]
  sellAmountCryptoPrecision: string
  sellAmountUserCurrency: string | undefined
  onChangeAccountId: AccountDropdownProps['onChange']
  onChangeIsInputtingFiatSellAmount: (isInputtingFiatSellAmount: boolean) => void
  onChangeSellAmountCryptoPrecision: (sellAmountCryptoPrecision: string) => void
  placeholder?: string
}

export const SellAssetInput = memo(
  ({
    accountId,
    asset,
    label,
    percentOptions,
    isInputtingFiatSellAmount,
    isLoading,
    sellAmountCryptoPrecision,
    sellAmountUserCurrency,
    onChangeAccountId,
    onChangeIsInputtingFiatSellAmount,
    onChangeSellAmountCryptoPrecision,
    ...rest
  }: SellAssetInputProps) => {
    const [rawSellAmountCryptoPrecision, setRawSellAmountCryptoPrecision] =
      useState(sellAmountCryptoPrecision)
    const [rawSellAmountUserCurrency, setRawSellAmountUserCurrency] =
      useState(sellAmountUserCurrency)
    const debouncedSellAmountCryptoPrecision = useDebounce(rawSellAmountCryptoPrecision, 500)

    const dispatch = useAppDispatch()

    const { price: sellAssetUserCurrencyRate } =
      useAppSelector(state => selectMarketDataByFilter(state, { assetId: asset.assetId })) || {}

    // sync local state with redux, but don't override fiat when user is inputting fiat
    useEffect(() => {
      setRawSellAmountCryptoPrecision(sellAmountCryptoPrecision)
      // Only sync fiat from Redux when not inputting fiat to preserve user input
      if (!isInputtingFiatSellAmount) {
        setRawSellAmountUserCurrency(sellAmountUserCurrency ?? '')
      }
    }, [sellAmountCryptoPrecision, sellAmountUserCurrency, isInputtingFiatSellAmount])

    // sync redux with local state
    useEffect(() => {
      const value = debouncedSellAmountCryptoPrecision
        ? positiveOrZero(debouncedSellAmountCryptoPrecision).toString()
        : ''
      onChangeSellAmountCryptoPrecision(value)
    }, [debouncedSellAmountCryptoPrecision, dispatch, onChangeSellAmountCryptoPrecision])

    const handleSellAssetInputChange = useCallback(
      (value: string, isFiat: boolean | undefined) => {
        const isRateZero = bnOrZero(sellAssetUserCurrencyRate).isZero()

        // If value is empty, set both amounts to empty string
        if (!value) {
          setRawSellAmountCryptoPrecision('')
          setRawSellAmountUserCurrency('')
          return
        }

        // Avoid division by zero
        const sellAmountCryptoPrecision = isFiat
          ? isRateZero
            ? ''
            : bnOrZero(value).div(bnOrZero(sellAssetUserCurrencyRate)).toString()
          : value

        // When converting crypto to fiat, round to 2 decimals to avoid long decimal strings
        const sellAmountUserCurrency = !isFiat
          ? bnOrZero(value).times(bnOrZero(sellAssetUserCurrencyRate)).decimalPlaces(2).toString()
          : value

        setRawSellAmountCryptoPrecision(sellAmountCryptoPrecision)
        setRawSellAmountUserCurrency(sellAmountUserCurrency)
      },
      [sellAssetUserCurrencyRate],
    )

    return (
      <TradeAssetInput
        accountId={accountId}
        assetId={asset.assetId}
        assetSymbol={asset.symbol}
        assetIcon={asset.icon}
        cryptoAmount={rawSellAmountCryptoPrecision}
        fiatAmount={rawSellAmountUserCurrency ?? ''}
        isFiat={isInputtingFiatSellAmount}
        onToggleIsFiat={onChangeIsInputtingFiatSellAmount}
        isSendMaxDisabled={false}
        onChange={handleSellAssetInputChange}
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={label}
        formControlProps={formControlProps}
        onAccountIdChange={onChangeAccountId}
        {...rest}
      />
    )
  },
)
