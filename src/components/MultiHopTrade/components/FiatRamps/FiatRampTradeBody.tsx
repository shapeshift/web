import { ChevronDownIcon } from '@chakra-ui/icons'
import { Stack, useMediaQuery } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'

import { TradeAssetInput } from '../TradeAssetInput'
import { FiatInput } from './FiatInput'

import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { FiatMenuButton } from '@/components/AssetSelection/components/FiatMenuButton'
import { FormDivider } from '@/components/FormDivider'
import type { FiatTypeEnumWithoutCryptos } from '@/constants/fiats'
import { FiatTypeEnum } from '@/constants/FiatTypeEnum'
import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

type FiatRampTradeBodyProps = {
  type: 'buy' | 'sell'
  onSellAssetChange: (asset: Asset | null) => void
  onBuyAssetChange: (asset: Asset | null) => void
  onSellAmountChange: (amount: string) => void
  onBuyAmountChange: (amount: string) => void
  onSellFiatChange?: (fiat: FiatTypeEnumWithoutCryptos | null) => void
  onBuyFiatChange?: (fiat: FiatTypeEnumWithoutCryptos | null) => void
  buyAsset: Asset | null
  sellAsset: Asset | null
  sellAmount: string
  buyAmount: string
  isLoading?: boolean
}

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}

const percentOptions: number[] = []
const fiatInputRightIcon = <ChevronDownIcon />
const fiatInputButtonProps = {
  rightIcon: fiatInputRightIcon,
  borderRadius: 'full',
  px: 2,
}

const fiatQuickAmounts = ['$100', '$300', '$1,000']

export const FiatRampTradeBody: React.FC<FiatRampTradeBodyProps> = ({
  type,
  buyAsset,
  sellAsset,
  onSellAssetChange,
  onBuyAssetChange,
  onSellAmountChange,
  onSellFiatChange,
  onBuyFiatChange,
  sellAmount,
  buyAmount,
  isLoading,
}) => {
  const [selectedFiat, setSelectedFiat] = useState<FiatTypeEnumWithoutCryptos>(FiatTypeEnum.USD)

  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const sellAssetSearch = useModal('sellTradeAssetSearch')
  const buyAssetSearch = useModal('buyTradeAssetSearch')

  const chainIdFilterPredicate = useCallback(() => true, [])

  const sellAssetFilterPredicate = useCallback(() => {
    return type === 'buy' ? false : true
  }, [type])

  const buyAssetFilterPredicate = useCallback(() => {
    return type === 'buy' ? true : false
  }, [type])

  const handleFiatClick = useCallback(() => {
    sellAssetSearch.open({
      onFiatClick: (fiat: FiatTypeEnumWithoutCryptos) => {
        if (type === 'buy') {
          onSellFiatChange?.(fiat)
        }

        onBuyFiatChange?.(fiat)
        setSelectedFiat(fiat)
      },
      onAssetClick: () => {},
      title: type === 'buy' ? 'modals.ramp.payWith' : 'modals.ramp.sellAsset',
      assetFilterPredicate: sellAssetFilterPredicate,
      chainIdFilterPredicate,
      showFiatTab: true,
      showAssetTab: false,
    })
  }, [
    sellAssetSearch,
    type,
    sellAssetFilterPredicate,
    chainIdFilterPredicate,
    onSellFiatChange,
    onBuyFiatChange,
  ])

  const handleSellAssetClick = useCallback(() => {
    sellAssetSearch.open({
      onAssetClick: (asset: Asset) => {
        onSellAssetChange(asset)
      },
      title: type === 'buy' ? 'modals.ramp.payWith' : 'modals.ramp.sellAsset',
      assetFilterPredicate: sellAssetFilterPredicate,
      chainIdFilterPredicate,
      showFiatTab: type === 'buy', // Show fiat tab for buy
      showAssetTab: type === 'sell', // Show asset tab for sell
    })
  }, [sellAssetSearch, onSellAssetChange, type, sellAssetFilterPredicate, chainIdFilterPredicate])

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: (asset: Asset) => {
        onBuyAssetChange(asset)
      },
      title: type === 'buy' ? 'modals.ramp.buyAsset' : 'modals.ramp.receiveAsset',
      assetFilterPredicate: buyAssetFilterPredicate,
      chainIdFilterPredicate,
      showFiatTab: type === 'sell', // Show fiat tab for sell
      showAssetTab: type === 'buy', // Show asset tab for buy
    })
  }, [buyAssetSearch, onBuyAssetChange, type, buyAssetFilterPredicate, chainIdFilterPredicate])

  const handleSellAmountChange = useCallback(
    (amount: string) => {
      onSellAmountChange(amount)
    },
    [onSellAmountChange],
  )

  const assetSelectButtonProps = useMemo(() => {
    return {
      maxWidth: isSmallerThanMd ? '100%' : undefined,
    }
  }, [isSmallerThanMd])

  const sellTradeAssetSelect = useMemo(() => {
    if (!sellAsset) return

    return (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={onSellAssetChange}
        onlyConnectedChains={true}
        chainIdFilterPredicate={chainIdFilterPredicate}
        showChainDropdown={false}
        buttonProps={assetSelectButtonProps}
        mb={isSmallerThanMd ? 0 : 4}
      />
    )
  }, [
    isSmallerThanMd,
    assetSelectButtonProps,
    handleSellAssetClick,
    sellAsset,
    onSellAssetChange,
    chainIdFilterPredicate,
  ])

  const buyTradeAssetSelect = useMemo(() => {
    if (!buyAsset) return

    return (
      <TradeAssetSelect
        assetId={buyAsset.assetId}
        onAssetClick={handleBuyAssetClick}
        onAssetChange={onSellAssetChange}
        onlyConnectedChains={true}
        chainIdFilterPredicate={chainIdFilterPredicate}
        showChainDropdown={false}
        buttonProps={assetSelectButtonProps}
        mb={isSmallerThanMd ? 0 : 4}
      />
    )
  }, [
    isSmallerThanMd,
    assetSelectButtonProps,
    handleBuyAssetClick,
    buyAsset,
    onSellAssetChange,
    chainIdFilterPredicate,
  ])

  const fiatSelect = useMemo(() => {
    return (
      <FiatMenuButton
        fiat={selectedFiat}
        onFiatClick={handleFiatClick}
        buttonProps={fiatInputButtonProps}
      />
    )
  }, [selectedFiat, handleFiatClick])

  const handleQuickAmountClick = useCallback(
    (amount: string) => {
      const numericAmount = amount.replace('$', '').replace(',', '')
      handleSellAmountChange(numericAmount)
    },
    [handleSellAmountChange],
  )

  const handleAccountIdChange = useCallback(() => {
    // TODO: Implement
  }, [])

  if (!buyAsset || !sellAsset) return null

  if (type === 'buy') {
    return (
      <Stack spacing={4}>
        <FiatInput
          selectedFiat={selectedFiat}
          amount={sellAmount}
          label='Pay With'
          labelPostFix={fiatSelect}
          onAmountChange={handleSellAmountChange}
          quickAmounts={fiatQuickAmounts}
          onQuickAmountClick={handleQuickAmountClick}
        />

        <FormDivider isDisabled={true} isLoading={isLoading} mt={2} />

        <TradeAssetInput
          accountId={undefined}
          assetId={buyAsset.assetId}
          assetSymbol={buyAsset.symbol}
          assetIcon={buyAsset.icon}
          cryptoAmount={buyAmount}
          fiatAmount={buyAmount}
          percentOptions={percentOptions}
          labelPostFix={buyTradeAssetSelect}
          formControlProps={formControlProps}
          isReadOnly={true}
          showInputSkeleton={false}
          showFiatSkeleton={false}
          label='You Get'
          onAccountIdChange={handleAccountIdChange}
        />
      </Stack>
    )
  }

  return (
    <Stack spacing={4} p={4}>
      {/* Crypto Asset Input */}
      <TradeAssetInput
        accountId={undefined}
        assetId={sellAsset.assetId}
        assetSymbol={sellAsset.symbol}
        assetIcon={sellAsset.icon}
        cryptoAmount={sellAmount}
        fiatAmount={sellAmount}
        percentOptions={percentOptions}
        labelPostFix={sellTradeAssetSelect}
        onChange={handleSellAmountChange}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        formControlProps={formControlProps}
        label='Sell Amount'
        onAccountIdChange={handleAccountIdChange}
      />

      <FormDivider isDisabled={true} isLoading={isLoading} mt={0} />

      <FiatInput
        selectedFiat={selectedFiat}
        amount={buyAmount}
        labelPostFix={fiatSelect}
        label='Receive Amount'
        isReadOnly={true}
        placeholder='0.00'
      />
    </Stack>
  )
}
