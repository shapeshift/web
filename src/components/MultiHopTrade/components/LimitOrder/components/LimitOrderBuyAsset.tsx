import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import React, { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeAssetInput } from '../../TradeAssetInput'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { useActions } from '@/hooks/useActions'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero, positiveOrZero } from '@/lib/bignumber/bignumber'
import { LimitPriceMode } from '@/state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectBuyAmountCryptoPrecision,
  selectBuyAmountUserCurrency,
  selectInputSellAmountCryptoPrecision,
  selectManualReceiveAddress,
} from '@/state/slices/limitOrderInputSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const emptyPercentOptions: number[] = []
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}

export type LimitOrderBuyAssetProps = {
  asset: Asset
  accountId?: AccountId
  assetFilterPredicate: (assetId: AssetId) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
  onAccountIdChange: AccountDropdownProps['onChange']
  onSetBuyAsset: (asset: Asset) => void
  isLoading: boolean
  selectedChainId?: ChainId | 'All'
  onSelectedChainIdChange?: (chainId: ChainId | 'All') => void
}

export const LimitOrderBuyAsset: React.FC<LimitOrderBuyAssetProps> = memo(
  ({
    asset,
    isLoading,
    accountId,
    assetFilterPredicate,
    chainIdFilterPredicate,
    onAccountIdChange,
    onSetBuyAsset,
    selectedChainId,
    onSelectedChainIdChange,
  }) => {
    const [isInputtingFiatSellAmount, setIsInputtingFiatSellAmount] = useState(false)
    const translate = useTranslate()
    const buyAssetSearch = useModal('buyTradeAssetSearch')

    const buyAmountCryptoPrecision = useAppSelector(selectBuyAmountCryptoPrecision)
    const buyAmountUserCurrency = useAppSelector(selectBuyAmountUserCurrency)
    const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
    const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)
    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
    )

    const { setLimitPrice, setLimitPriceMode } = useActions(limitOrderInput.actions)

    const handleToggleIsFiat = useCallback(() => {
      setIsInputtingFiatSellAmount(prev => !prev)
    }, [])

    const handleAmountChange = useCallback(
      (value: string) => {
        // Always process the input change, even if value is 0
        if (sellAmountCryptoPrecision && Number(sellAmountCryptoPrecision) > 0) {
          // Convert value to crypto amount if it's in fiat
          const cryptoValue = isInputtingFiatSellAmount
            ? bnOrZero(value).div(marketData.price).toString()
            : value

          const newRate = bnOrZero(cryptoValue).div(sellAmountCryptoPrecision).toString()

          setLimitPriceMode(LimitPriceMode.CustomValue)
          setLimitPrice({
            marketPriceBuyAsset: newRate,
          })
        }
      },
      [
        sellAmountCryptoPrecision,
        setLimitPrice,
        setLimitPriceMode,
        isInputtingFiatSellAmount,
        marketData.price,
      ],
    )

    const handleAssetClick = useCallback(() => {
      buyAssetSearch.open({
        onAssetClick: onSetBuyAsset,
        title: 'trade.tradeTo',
        assetFilterPredicate,
        chainIdFilterPredicate,
        selectedChainId,
        onSelectedChainIdChange,
      })
    }, [
      assetFilterPredicate,
      buyAssetSearch,
      chainIdFilterPredicate,
      onSetBuyAsset,
      selectedChainId,
      onSelectedChainIdChange,
    ])

    const tradeAssetSelect = useMemo(
      () => (
        <TradeAssetSelect
          assetId={asset.assetId}
          onAssetClick={handleAssetClick}
          onAssetChange={onSetBuyAsset}
          onlyConnectedChains={false}
          assetFilterPredicate={assetFilterPredicate}
          chainIdFilterPredicate={chainIdFilterPredicate}
        />
      ),
      [
        asset.assetId,
        handleAssetClick,
        onSetBuyAsset,
        assetFilterPredicate,
        chainIdFilterPredicate,
      ],
    )

    return (
      <TradeAssetInput
        isAccountSelectionHidden={Boolean(manualReceiveAddress)}
        accountId={accountId}
        onAccountIdChange={onAccountIdChange}
        assetId={asset.assetId}
        assetSymbol={asset.symbol}
        assetIcon={asset.icon}
        cryptoAmount={positiveOrZero(buyAmountCryptoPrecision).toFixed()}
        fiatAmount={positiveOrZero(buyAmountUserCurrency).toFixed()}
        percentOptions={emptyPercentOptions}
        isFiat={isInputtingFiatSellAmount}
        onToggleIsFiat={handleToggleIsFiat}
        showInputSkeleton={isLoading}
        showFiatSkeleton={isLoading}
        label={translate('limitOrder.youGet')}
        formControlProps={formControlProps}
        labelPostFix={tradeAssetSelect}
        onChange={handleAmountChange}
      />
    )
  },
)
