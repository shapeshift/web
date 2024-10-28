import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { positiveOrZero } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { useInputOutputDifferenceDecimalPercentage } from 'components/MultiHopTrade/hooks/useInputOutputDifference'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isToken } from 'lib/utils'
import {
  selectHasUserEnteredAmount,
  selectHighestMarketCapFeeAsset,
  selectIsAccountMetadataLoadingByAccountId,
  selectWalletConnectedChainIds,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TradeAssetInput } from '../TradeAssetInput'
import { SellAssetInput } from '../TradeInput/components/SellAssetInput'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}
const arrowDownIcon = <ArrowDownIcon />
const emptyPercentOptions: number[] = []

type SharedTradeInputBodyProps = {
  activeQuote: TradeQuote | undefined
  buyAmountAfterFeesCryptoPrecision: string | undefined
  buyAmountAfterFeesUserCurrency: string | undefined
  buyAsset: Asset
  buyAssetAccountId: AccountId | undefined
  isInputtingFiatSellAmount: boolean
  isLoading: boolean | undefined
  manualReceiveAddress: string | undefined
  sellAmountCryptoPrecision: string
  sellAmountUserCurrency: string | undefined
  sellAsset: Asset
  sellAssetAccountId: AccountId | undefined
  handleSwitchAssets: () => void
  onChangeIsInputtingFiatSellAmount: (isInputtingFiatSellAmount: boolean) => void
  onChangeSellAmountCryptoPrecision: (sellAmountCryptoPrecision: string) => void
  setBuyAsset: (asset: Asset) => void
  setBuyAssetAccountId: (accountId: AccountId) => void
  setSellAsset: (asset: Asset) => void
  setSellAssetAccountId: (accountId: AccountId) => void
}

export const SharedTradeInputBody = ({
  activeQuote,
  buyAmountAfterFeesCryptoPrecision,
  buyAmountAfterFeesUserCurrency,
  buyAsset,
  buyAssetAccountId,
  isInputtingFiatSellAmount,
  isLoading,
  manualReceiveAddress,
  sellAmountCryptoPrecision,
  sellAmountUserCurrency,
  sellAsset,
  sellAssetAccountId,
  handleSwitchAssets,
  onChangeIsInputtingFiatSellAmount,
  onChangeSellAmountCryptoPrecision,
  setBuyAsset,
  setBuyAssetAccountId,
  setSellAsset,
  setSellAssetAccountId,
}: SharedTradeInputBodyProps) => {
  const translate = useTranslate()
  const {
    state: { walletInfo, wallet },
  } = useWallet()

  const hasWallet = useMemo(() => Boolean(walletInfo?.deviceId), [walletInfo])

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const defaultSellAsset = useAppSelector(selectHighestMarketCapFeeAsset)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()
  const isAccountMetadataLoadingByAccountId = useAppSelector(
    selectIsAccountMetadataLoadingByAccountId,
  )

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const buyAssetSearch = useModal('buyTradeAssetSearch')
  const sellAssetSearch = useModal('sellTradeAssetSearch')

  const percentOptions = useMemo(() => {
    if (!sellAsset?.assetId) return []
    if (!isToken(sellAsset.assetId)) return []

    return [1]
  }, [sellAsset.assetId])

  const inputOutputDifferenceDecimalPercentage =
    useInputOutputDifferenceDecimalPercentage(activeQuote)

  // If the user disconnects the chain for the currently selected sell asset, switch to the default asset
  useEffect(() => {
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
    })
  }, [sellAssetSearch, setSellAsset])

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: setBuyAsset,
      title: 'trade.tradeTo',
    })
  }, [buyAssetSearch, setBuyAsset])

  const sellTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={sellAsset.assetId}
        onAssetClick={handleSellAssetClick}
        onAssetChange={setSellAsset}
        onlyConnectedChains={true}
      />
    ),
    [handleSellAssetClick, sellAsset.assetId, setSellAsset],
  )

  const buyTradeAssetSelect = useMemo(
    () => (
      <TradeAssetSelect
        assetId={buyAsset.assetId}
        onAssetClick={handleBuyAssetClick}
        onAssetChange={setBuyAsset}
        onlyConnectedChains={false}
      />
    ),
    [buyAsset.assetId, handleBuyAssetClick, setBuyAsset],
  )

  // disable switching assets if the buy asset isn't supported
  const shouldDisableSwitchAssets = useMemo(() => {
    if (!hasWallet) return false

    return !walletSupportsBuyAssetChain || isLoading
  }, [hasWallet, walletSupportsBuyAssetChain, isLoading])

  return (
    <Stack spacing={0}>
      <SellAssetInput
        accountId={sellAssetAccountId}
        asset={sellAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        label={translate('trade.payWith')}
        labelPostFix={sellTradeAssetSelect}
        percentOptions={percentOptions}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={sellAmountUserCurrency}
        onChangeAccountId={setSellAssetAccountId}
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
              isDisabled={shouldDisableSwitchAssets}
            />
          </CircularProgressLabel>
        </CircularProgress>

        <Divider />
      </Flex>
      <TradeAssetInput
        // Disable account selection when user set a manual receive address
        isAccountSelectionHidden={Boolean(manualReceiveAddress)}
        isReadOnly={true}
        accountId={buyAssetAccountId}
        assetId={buyAsset.assetId}
        assetSymbol={buyAsset.symbol}
        assetIcon={buyAsset.icon}
        cryptoAmount={
          hasUserEnteredAmount ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed() : '0'
        }
        fiatAmount={
          hasUserEnteredAmount ? positiveOrZero(buyAmountAfterFeesUserCurrency).toFixed() : '0'
        }
        percentOptions={emptyPercentOptions}
        showInputSkeleton={isLoading}
        showFiatSkeleton={isLoading}
        label={translate('trade.youGet')}
        onAccountIdChange={setBuyAssetAccountId}
        formControlProps={formControlProps}
        labelPostFix={buyTradeAssetSelect}
        inputOutputDifferenceDecimalPercentage={inputOutputDifferenceDecimalPercentage}
      />
    </Stack>
  )
}
