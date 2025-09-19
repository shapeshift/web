import { ChevronDownIcon } from '@chakra-ui/icons'
import { Box, Stack, useMediaQuery } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { TradeAssetInput } from '../TradeAssetInput'
import { FiatInput } from './FiatInput'

import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { FiatMenuButton } from '@/components/AssetSelection/components/FiatMenuButton'
import { FormDivider } from '@/components/FormDivider'
import type { FiatCurrencyItem } from '@/components/Modals/FiatRamps/config'
import { fiatCurrencyObjectsByCode } from '@/components/Modals/FiatRamps/config'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatCurrencyTypeEnum } from '@/constants/FiatCurrencyTypeEnum'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import {
  selectBuyFiatCurrency,
  selectSellFiatCurrency,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type FiatRampTradeBodyProps = {
  direction: FiatRampAction
  onSellAssetChange: (asset: Asset | null) => void
  onBuyAssetChange: (asset: Asset | null) => void
  onSellAmountChange: (amount: string) => void
  onSellFiatChange?: (fiat: FiatCurrencyItem | null) => void
  onBuyFiatChange?: (fiat: FiatCurrencyItem | null) => void
  onSellFiatAmountChange?: (amount: string) => void
  buyAsset: Asset | null
  sellAsset: Asset | null
  sellAmountCryptoPrecision: string
  buyAmount: string
  sellFiatAmount?: string
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

const fiatQuickAmounts = [
  {
    formattedAmount: '$100',
    value: '100',
  },
  {
    formattedAmount: '$300',
    value: '300',
  },
  {
    formattedAmount: '$1,000',
    value: '1000',
  },
]

export const FiatRampTradeBody: React.FC<FiatRampTradeBodyProps> = ({
  direction,
  buyAsset,
  sellAsset,
  onSellAssetChange,
  onBuyAssetChange,
  onSellAmountChange,
  onSellFiatChange,
  onBuyFiatChange,
  onSellFiatAmountChange,
  sellAmountCryptoPrecision,
  buyAmount,
  sellFiatAmount = '0',
  isLoading = false,
}) => {
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const buyAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, buyAsset?.assetId ?? ''),
  )
  const sellAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, sellAsset?.assetId ?? ''),
  )
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const maybeSellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const maybeBuyFiatCurrency = useAppSelector(selectBuyFiatCurrency)

  const sellFiatCurrency =
    maybeSellFiatCurrency ?? fiatCurrencyObjectsByCode[FiatCurrencyTypeEnum.USD]
  const buyFiatCurrency =
    maybeBuyFiatCurrency ?? fiatCurrencyObjectsByCode[FiatCurrencyTypeEnum.USD]

  const sellAssetSearch = useModal('sellTradeAssetSearch')
  const buyAssetSearch = useModal('buyTradeAssetSearch')

  const buyAmountUserCurrency = useMemo(() => {
    return bnOrZero(buyAmount)
      .times(buyAssetMarketData?.price ?? 0)
      .toString()
  }, [buyAmount, buyAssetMarketData])

  const sellAmountUserCurrency = useMemo(() => {
    return bnOrZero(sellAmountCryptoPrecision)
      .times(sellAssetMarketData?.price ?? 0)
      .toString()
  }, [sellAmountCryptoPrecision, sellAssetMarketData])

  const chainIdFilterPredicate = useCallback(() => true, [])

  const sellAssetFilterPredicate = useCallback(() => {
    return direction === FiatRampAction.Buy ? false : true
  }, [direction])

  const buyAssetFilterPredicate = useCallback(() => {
    return direction === FiatRampAction.Buy ? true : false
  }, [direction])

  const handleFiatClick = useCallback(() => {
    sellAssetSearch.open({
      onSelectFiatCurrency: (fiat: FiatCurrencyItem) => {
        if (direction === FiatRampAction.Buy) {
          onSellFiatChange?.(fiat)
        } else {
          onBuyFiatChange?.(fiat)
        }
      },
      onAssetClick: () => {},
      title: direction === FiatRampAction.Buy ? 'modals.ramp.payWith' : 'modals.ramp.sellAsset',
      assetFilterPredicate: sellAssetFilterPredicate,
      chainIdFilterPredicate,
      showFiatTab: true,
      showAssetTab: false,
    })
  }, [
    sellAssetSearch,
    direction,
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
      title: direction === FiatRampAction.Buy ? 'modals.ramp.payWith' : 'modals.ramp.sellAsset',
      assetFilterPredicate: sellAssetFilterPredicate,
      chainIdFilterPredicate,
      showFiatTab: direction === FiatRampAction.Buy,
      showAssetTab: direction === FiatRampAction.Sell,
    })
  }, [
    sellAssetSearch,
    onSellAssetChange,
    direction,
    sellAssetFilterPredicate,
    chainIdFilterPredicate,
  ])

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: (asset: Asset) => {
        onBuyAssetChange(asset)
      },
      title: direction === FiatRampAction.Buy ? 'modals.ramp.buyAsset' : 'modals.ramp.receiveAsset',
      assetFilterPredicate: buyAssetFilterPredicate,
      chainIdFilterPredicate,
      showFiatTab: direction === FiatRampAction.Sell,
      showAssetTab: direction === FiatRampAction.Buy,
    })
  }, [buyAssetSearch, onBuyAssetChange, direction, buyAssetFilterPredicate, chainIdFilterPredicate])

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
    const currentFiatCurrency =
      direction === FiatRampAction.Buy ? sellFiatCurrency : buyFiatCurrency
    return (
      <FiatMenuButton
        selectedFiatCurrency={currentFiatCurrency}
        onClick={handleFiatClick}
        buttonProps={fiatInputButtonProps}
      />
    )
  }, [direction, sellFiatCurrency, buyFiatCurrency, handleFiatClick])

  const handleQuickAmountClick = useCallback(
    (amount: string) => {
      if (direction === FiatRampAction.Buy) {
        onSellFiatAmountChange?.(amount)
      } else {
        handleSellAmountChange(amount)
      }
    },
    [direction, onSellFiatAmountChange, handleSellAmountChange],
  )

  const handleAccountIdChange = useCallback(
    (accountId: AccountId) => {
      if (direction === FiatRampAction.Buy) {
        dispatch(tradeRampInput.actions.setBuyAccountId(accountId))
      } else {
        dispatch(tradeRampInput.actions.setSellAccountId(accountId))
      }
    },
    [direction, dispatch],
  )

  if (!buyAsset || !sellAsset) return null

  if (direction === FiatRampAction.Buy) {
    return (
      <Stack spacing={4}>
        <FiatInput
          selectedFiatCurrency={sellFiatCurrency}
          amount={sellFiatAmount}
          label={translate('trade.payWith')}
          labelPostFix={fiatSelect}
          onAmountChange={onSellFiatAmountChange}
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
          fiatAmount={buyAmountUserCurrency}
          percentOptions={percentOptions}
          labelPostFix={buyTradeAssetSelect}
          formControlProps={formControlProps}
          isReadOnly={true}
          showInputSkeleton={isLoading}
          showFiatSkeleton={Boolean(isLoading && sellFiatAmount && sellFiatAmount !== '0')}
          label={translate('trade.youGet')}
          onAccountIdChange={handleAccountIdChange}
        />
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      <TradeAssetInput
        accountId={undefined}
        assetId={sellAsset.assetId}
        assetSymbol={sellAsset.symbol}
        assetIcon={sellAsset.icon}
        cryptoAmount={sellAmountCryptoPrecision}
        fiatAmount={sellAmountUserCurrency}
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

      <Box mb={6}>
        <FiatInput
          selectedFiatCurrency={buyFiatCurrency}
          amount={buyAmount}
          labelPostFix={fiatSelect}
          label={translate('modals.ramp.receiveAmount')}
          isReadOnly={true}
          placeholder='0.00'
          showPrefix={false}
          isLoading={Boolean(
            isLoading && sellAmountCryptoPrecision && sellAmountCryptoPrecision !== '0',
          )}
        />
      </Box>
    </Stack>
  )
}
