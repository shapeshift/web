import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { useModal } from 'hooks/useModal/useModal'
import { isToken } from 'lib/utils'
import {
  selectHighestMarketCapFeeAsset,
  selectIsAccountMetadataLoadingByAccountId,
  selectWalletConnectedChainIds,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SellAssetInput } from '../TradeInput/components/SellAssetInput'

const arrowDownIcon = <ArrowDownIcon />

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
  assetFilterPredicate: (asset: Asset) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
  onSwitchAssets: () => void
  onChangeIsInputtingFiatSellAmount: (isInputtingFiatSellAmount: boolean) => void
  onChangeSellAmountCryptoPrecision: (sellAmountCryptoPrecision: string) => void
  setSellAsset: (asset: Asset) => void
  setSellAccountId: (accountId: AccountId) => void
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
}: SharedTradeInputBodyProps) => {
  const translate = useTranslate()

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const defaultSellAsset = useAppSelector(selectHighestMarketCapFeeAsset)
  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()
  const isAccountMetadataLoadingByAccountId = useAppSelector(
    selectIsAccountMetadataLoadingByAccountId,
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
    })
  }, [assetFilterPredicate, chainIdFilterPredicate, sellAssetSearch, setSellAsset])

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        onlyConnectedChains={true}
        chainIdFilterPredicate={chainIdFilterPredicate}
      />
    ),
    [handleSellAssetClick, sellAsset.assetId, setSellAsset, chainIdFilterPredicate],
  )

  return (
    <Stack spacing={0}>
      <SellAssetInput
        accountId={sellAccountId}
        asset={sellAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
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
              icon={arrowDownIcon}
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
