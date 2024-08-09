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
import type { Asset } from '@shapeshiftoss/types'
import { positiveOrZero } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isToken } from 'lib/utils'
import {
  selectHasUserEnteredAmount,
  selectHighestMarketCapFeeAsset,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectWalletConnectedChainIds,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectActiveQuote,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountAfterFeesUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeAssetInput } from '../../TradeAssetInput'
import { SellAssetInput } from './SellAssetInput'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
}
const arrowDownIcon = <ArrowDownIcon />
const emptyPercentOptions: number[] = []

type TradeInputBodyProps = {
  isLoading: boolean | undefined
  manualReceiveAddress: string | undefined
  initialSellAssetAccountId: AccountId | undefined
  initialBuyAssetAccountId: AccountId | undefined
  setSellAssetAccountId: (accountId: AccountId) => void
  setBuyAssetAccountId: (accountId: AccountId) => void
}

export const TradeInputBody = ({
  isLoading,
  manualReceiveAddress,
  initialSellAssetAccountId,
  initialBuyAssetAccountId,
  setSellAssetAccountId,
  setBuyAssetAccountId,
}: TradeInputBodyProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const {
    state: { wallet },
  } = useWallet()

  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const defaultSellAsset = useAppSelector(selectHighestMarketCapFeeAsset)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)

  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)
  const buyAssetSearch = useModal('buyTradeAssetSearch')
  const sellAssetSearch = useModal('sellTradeAssetSearch')

  const setBuyAsset = useCallback(
    (asset: Asset) => dispatch(tradeInput.actions.setBuyAsset(asset)),
    [dispatch],
  )
  const setSellAsset = useCallback(
    (asset: Asset) => dispatch(tradeInput.actions.setSellAsset(asset)),
    [dispatch],
  )
  const handleSwitchAssets = useCallback(
    () => dispatch(tradeInput.actions.switchAssets()),
    [dispatch],
  )

  const percentOptions = useMemo(() => {
    if (!sellAsset?.assetId) return []
    if (!isToken(sellAsset.assetId)) return []

    return [1]
  }, [sellAsset.assetId])
  const activeQuote = useAppSelector(selectActiveQuote)
  const { priceImpactPercentage } = usePriceImpact(activeQuote)

  // If the user disconnects the chain for the currently selected sell asset, switch to the default asset
  useEffect(() => {
    if (!defaultSellAsset) return

    if (walletConnectedChainIds.includes(sellAsset.chainId)) return

    setSellAsset(defaultSellAsset)
  }, [defaultSellAsset, sellAsset, setSellAsset, walletConnectedChainIds])

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
    return !walletSupportsBuyAssetChain
  }, [walletSupportsBuyAssetChain])

  return (
    <Stack spacing={0}>
      <SellAssetInput
        accountId={initialSellAssetAccountId}
        asset={sellAsset}
        label={translate('trade.payWith')}
        onAccountIdChange={setSellAssetAccountId}
        labelPostFix={sellTradeAssetSelect}
        percentOptions={percentOptions}
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
        accountId={initialBuyAssetAccountId}
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
        priceImpactPercentage={priceImpactPercentage?.toString()}
      />
    </Stack>
  )
}
