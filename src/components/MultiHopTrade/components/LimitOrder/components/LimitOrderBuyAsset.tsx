import { useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import React, { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeAssetInput } from '../../TradeAssetInput'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { useActions } from '@/hooks/useActions'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
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
import { breakpoints } from '@/theme/theme'

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
    const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
    const [isInputtingFiatSellAmount, setIsInputtingFiatSellAmount] = useState(false)
    const [buyAmount, setBuyAmount] = useState<string | null>(null)
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
      setIsInputtingFiatSellAmount(!isInputtingFiatSellAmount)
    }, [isInputtingFiatSellAmount])

    const handleAmountChange = useCallback(
      (value: string) => {
        setBuyAmount(value)

        if (bnOrZero(sellAmountCryptoPrecision).gt(0)) {
          const cryptoValue = isInputtingFiatSellAmount
            ? bnOrZero(value)
                .div(bnOrZero(marketData?.price))
                .toString()
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
        marketData?.price,
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

    const assetSelectButtonProps = useMemo(() => {
      return {
        maxWidth: isSmallerThanMd ? '100%' : undefined,
      }
    }, [isSmallerThanMd])

    const tradeAssetSelect = useMemo(
      () => (
        <TradeAssetSelect
          assetId={asset.assetId}
          onAssetClick={handleAssetClick}
          onAssetChange={onSetBuyAsset}
          onlyConnectedChains={false}
          assetFilterPredicate={assetFilterPredicate}
          chainIdFilterPredicate={chainIdFilterPredicate}
          showChainDropdown={!isSmallerThanMd}
          buttonProps={assetSelectButtonProps}
        />
      ),
      [
        asset.assetId,
        handleAssetClick,
        onSetBuyAsset,
        assetFilterPredicate,
        chainIdFilterPredicate,
        assetSelectButtonProps,
        isSmallerThanMd,
      ],
    )

    const isUserTypedAmount = useMemo(() => {
      return buyAmount !== '' && buyAmount !== null
    }, [buyAmount])

    const cryptoAmount = useMemo(() => {
      if (bnOrZero(buyAmountCryptoPrecision).isZero() && !isUserTypedAmount) {
        return ''
      }

      return buyAmountCryptoPrecision
    }, [buyAmountCryptoPrecision, isUserTypedAmount])

    const fiatAmount = useMemo(() => {
      if (bnOrZero(buyAmountUserCurrency).isZero() && !isUserTypedAmount) {
        return ''
      }

      return buyAmountUserCurrency
    }, [buyAmountUserCurrency, isUserTypedAmount])

    return (
      <TradeAssetInput
        isAccountSelectionHidden={Boolean(manualReceiveAddress)}
        accountId={accountId}
        onAccountIdChange={onAccountIdChange}
        assetId={asset.assetId}
        assetSymbol={asset.symbol}
        assetIcon={asset.icon}
        placeholder={isInputtingFiatSellAmount ? '$0' : '0'}
        cryptoAmount={cryptoAmount}
        fiatAmount={fiatAmount}
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
