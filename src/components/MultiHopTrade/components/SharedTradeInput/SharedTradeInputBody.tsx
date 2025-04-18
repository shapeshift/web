import {
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { LuArrowUpDown } from 'react-icons/lu'
import { useTranslate } from 'react-polyglot'

import { SellAssetInput } from '../TradeInput/components/SellAssetInput'

import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { useAccountsFetchQuery } from '@/context/AppProvider/hooks/useAccountsFetchQuery'
import { useModal } from '@/hooks/useModal/useModal'
import { isToken } from '@/lib/utils'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import {
  selectHighestMarketCapFeeAsset,
  selectWalletConnectedChainIds,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const arrowUpDownIcon = <LuArrowUpDown />

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
}: SharedTradeInputBodyProps) => {
  const translate = useTranslate()

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const defaultSellAsset = useAppSelector(selectHighestMarketCapFeeAsset)
  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()
  const isAccountMetadataLoadingByAccountId = useAppSelector(
    portfolio.selectors.selectIsAccountMetadataLoadingByAccountId,
  )

  const sellAssetSearch = useModal('sellTradeAssetSearch')

  const percentOptions = useMemo(() => {
    if (!sellAsset?.assetId) return []
    if (!isToken(sellAsset.assetId)) return []

    return [1]
  }, [sellAsset.assetId])

  const hasJustSwitchedAssetsRef = useRef(false)
  const handleSwitchAssets = useCallback(() => {
    // Note we never set this back to false. This is intentional, as from the moment the user switches assets, we don't want any default pair logic to kick in anymore.
    hasJustSwitchedAssetsRef.current = true
    onSwitchAssets()
  }, [onSwitchAssets])

  // If the user disconnects the chain for the currently selected sell asset, switch to the default asset
  useEffect(() => {
    if (hasJustSwitchedAssetsRef.current) return

    // Don't do any default asset business as some accounts meta is still loading, or a wrong default asset may be set,
    // which takes over the "default default" sellAsset - double default intended:
    // https://github.com/shapeshift/web/blob/ba43c41527156f8c7e0f1170472ff362e091b450/src/state/slices/tradeInputSlice/tradeInputSlice.ts#L27
    if (Object.values(isAccountMetadataLoadingByAccountId).some(Boolean)) return
    if (!defaultSellAsset) return

    if (walletConnectedChainIds.includes(sellAsset.chainId)) return

    setSellAsset(defaultSellAsset)
  }, [
    defaultSellAsset,
    isAccountMetadataLoadingByAccountId,
    isAccountsMetadataLoading,
    sellAsset,
    setSellAsset,
    walletConnectedChainIds,
  ])

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

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        onlyConnectedChains={true}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
      />
    ),
    [
      sellAsset.assetId,
      handleSellAssetClick,
      setSellAsset,
      assetFilterPredicate,
      chainIdFilterPredicate,
    ],
  )

  return (
    <Stack spacing={0}>
      <SellAssetInput
        accountId={sellAccountId}
        asset={sellAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        placeholder={isInputtingFiatSellAmount ? '$0' : '0'}
        label={translate('trade.payWith')}
        labelPostFix={sellTradeAssetSelect}
        percentOptions={percentOptions}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={sellAmountUserCurrency}
        onChangeAccountId={setSellAccountId}
        onChangeIsInputtingFiatSellAmount={onChangeIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={onChangeSellAmountCryptoPrecision}
      />
      <Flex alignItems='center' justifyContent='center' my={-2}>
        <Divider />
        <CircularProgress
          color='blue.500'
          thickness='4px'
          size='34px'
          trackColor='transparent'
          isIndeterminate={isLoading}
          borderRadius='full'
        >
          <CircularProgressLabel
            fontSize='md'
            display='flex'
            alignItems='center'
            justifyContent='center'
          >
            <IconButton
              onClick={handleSwitchAssets}
              isRound
              size='sm'
              position='relative'
              variant='outline'
              borderColor='border.base'
              zIndex={1}
              aria-label={translate('lending.switchAssets')}
              icon={arrowUpDownIcon}
              isDisabled={isSwitchAssetsDisabled}
            />
          </CircularProgressLabel>
        </CircularProgress>

        <Divider />
      </Flex>
      {children}
    </Stack>
  )
}
