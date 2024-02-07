import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { TradeAssetInputProps } from 'components/MultiHopTrade/components/TradeAssetInput'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
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
    const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)

    const dispatch = useAppDispatch()

    const { price: sellAssetUserCurrencyRate } = useAppSelector(state =>
      selectMarketDataByFilter(state, { assetId: asset.assetId }),
    )

    // this is separated from handleSellAssetInputChange to prevent resetting the input value to 0
    // when the market data changes between keystrokes
    const handleSellAssetInputChangeInner = useCallback(
      (sellAmountCryptoPrecision: string) => {
        dispatch(
          tradeInput.actions.setSellAmountCryptoPrecision(
            positiveOrZero(sellAmountCryptoPrecision).toString(),
          ),
        )
      },
      [dispatch],
    )

    const handleSellAssetInputChange = useCallback(
      (value: string, isFiat: boolean | undefined) => {
        const sellAmountCryptoPrecision = isFiat
          ? bnOrZero(value).div(sellAssetUserCurrencyRate).toFixed()
          : value
        handleSellAssetInputChangeInner(sellAmountCryptoPrecision)
      },
      [handleSellAssetInputChangeInner, sellAssetUserCurrencyRate],
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
        cryptoAmount={sellAmountCryptoPrecision}
        fiatAmount={sellAmountUserCurrency}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        handleIsInputtingFiatSellAmountChange={handleIsInputtingFiatSellAmountChange}
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
