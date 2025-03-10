import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import React, { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeAssetInput } from '../../TradeAssetInput'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { useModal } from '@/hooks/useModal/useModal'
import { positiveOrZero } from '@/lib/bignumber/bignumber'
import {
  selectBuyAmountCryptoPrecision,
  selectBuyAmountUserCurrency,
  selectManualReceiveAddress,
} from '@/state/slices/limitOrderInputSlice/selectors'
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
  isInputtingFiatSellAmount: boolean
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
    const translate = useTranslate()
    const buyAssetSearch = useModal('buyTradeAssetSearch')

    const buyAmountCryptoPrecision = useAppSelector(selectBuyAmountCryptoPrecision)
    const buyAmountUserCurrency = useAppSelector(selectBuyAmountUserCurrency)

    const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

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
        // Disable account selection when user set a manual receive address
        isAccountSelectionHidden={Boolean(manualReceiveAddress)}
        isReadOnly={true}
        accountId={accountId}
        onAccountIdChange={onAccountIdChange}
        assetId={asset.assetId}
        assetSymbol={asset.symbol}
        assetIcon={asset.icon}
        cryptoAmount={positiveOrZero(buyAmountCryptoPrecision).toFixed()}
        fiatAmount={positiveOrZero(buyAmountUserCurrency).toFixed()}
        percentOptions={emptyPercentOptions}
        showInputSkeleton={isLoading}
        showFiatSkeleton={isLoading}
        label={translate('limitOrder.youGet')}
        formControlProps={formControlProps}
        labelPostFix={tradeAssetSelect}
      />
    )
  },
)
