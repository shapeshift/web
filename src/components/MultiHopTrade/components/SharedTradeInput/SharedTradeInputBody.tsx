import { Flex, Stack, useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SellAssetInput } from '../TradeInput/components/SellAssetInput'

import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { FormDivider } from '@/components/FormDivider'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

type SharedTradeInputBodyProps = {
  buyAsset: Asset
  children: JSX.Element
  isInputtingFiatSellAmount: boolean
  isLoading: boolean | undefined
  isSwitchAssetsDisabled?: boolean
  sellAmountCryptoPrecision: string
  sellAmountUserCurrency: string | undefined
  sellAsset: Asset
  sellAccountId: AccountId | undefined
  assetFilterPredicate: (assetId: AssetId) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
  onSwitchAssets: () => void
  onChangeIsInputtingFiatSellAmount: (isInputtingFiatSellAmount: boolean) => void
  onChangeSellAmountCryptoPrecision: (sellAmountCryptoPrecision: string) => void
  setSellAsset: (asset: Asset) => void
  setSellAccountId: (accountId: AccountId) => void
  selectedSellAssetChainId?: ChainId | 'All'
  onSellAssetChainIdChange?: (chainId: ChainId | 'All') => void
  subContent?: JSX.Element
}

export const SharedTradeInputBody = ({
  children,
  isInputtingFiatSellAmount,
  isLoading,
  isSwitchAssetsDisabled,
  sellAmountCryptoPrecision,
  sellAmountUserCurrency,
  sellAsset,
  sellAccountId,
  assetFilterPredicate,
  chainIdFilterPredicate,
  onSwitchAssets,
  onChangeIsInputtingFiatSellAmount,
  onChangeSellAmountCryptoPrecision,
  setSellAsset,
  setSellAccountId,
  selectedSellAssetChainId,
  onSellAssetChainIdChange,
  subContent,
}: SharedTradeInputBodyProps) => {
  const translate = useTranslate()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const placeholder = useMemo(() => {
    return isInputtingFiatSellAmount
      ? toFiat(0, {
          omitDecimalTrailingZeros: true,
        })
      : '0'
  }, [isInputtingFiatSellAmount, toFiat])

  const sellAssetSearch = useModal('sellTradeAssetSearch')

  const percentOptions = useMemo(() => {
    if (!sellAsset?.assetId) return []
    if (!isToken(sellAsset.assetId)) return []

    return [1]
  }, [sellAsset.assetId])

  const handleSwitchAssets = useCallback(() => {
    onSwitchAssets()
  }, [onSwitchAssets])

  const handleSellAssetClick = useCallback(() => {
    sellAssetSearch.open({
      onAssetClick: setSellAsset,
      title: 'trade.tradeFrom',
      assetFilterPredicate,
      chainIdFilterPredicate,
      selectedChainId: selectedSellAssetChainId,
      onSelectedChainIdChange: onSellAssetChainIdChange,
    })
  }, [
    assetFilterPredicate,
    chainIdFilterPredicate,
    sellAssetSearch,
    setSellAsset,
    selectedSellAssetChainId,
    onSellAssetChainIdChange,
  ])

  const assetSelectButtonProps = useMemo(() => {
    return {
      maxWidth: isSmallerThanMd ? '100%' : undefined,
    }
  }, [isSmallerThanMd])

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        onlyConnectedChains={true}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
        showChainDropdown={!isSmallerThanMd}
        buttonProps={assetSelectButtonProps}
        mb={isSmallerThanMd ? 0 : 4}
      />
    ),
    [
      sellAsset.assetId,
      isSmallerThanMd,
      assetSelectButtonProps,
      handleSellAssetClick,
      setSellAsset,
      assetFilterPredicate,
      chainIdFilterPredicate,
    ],
  )

  return (
    <Flex flexDir='column' height='100%' minHeight={0} overflow={'auto'}>
      <Stack spacing={0} flex='0 0 auto'>
        <SellAssetInput
          accountId={sellAccountId}
          asset={sellAsset}
          isInputtingFiatSellAmount={isInputtingFiatSellAmount}
          isLoading={isLoading}
          placeholder={isInputtingFiatSellAmount ? placeholder : '0'}
          label={translate('trade.payWith')}
          labelPostFix={sellTradeAssetSelect}
          percentOptions={percentOptions}
          sellAmountCryptoPrecision={sellAmountCryptoPrecision}
          sellAmountUserCurrency={sellAmountUserCurrency}
          onChangeAccountId={setSellAccountId}
          onChangeIsInputtingFiatSellAmount={onChangeIsInputtingFiatSellAmount}
          onChangeSellAmountCryptoPrecision={onChangeSellAmountCryptoPrecision}
        />
        <FormDivider
          isDisabled={isSwitchAssetsDisabled}
          isLoading={isLoading}
          mt={2}
          onClick={handleSwitchAssets}
        />
        {children}
      </Stack>
      {subContent && (
        <Flex flex='1' minHeight={0}>
          {subContent}
        </Flex>
      )}
    </Flex>
  )
}
