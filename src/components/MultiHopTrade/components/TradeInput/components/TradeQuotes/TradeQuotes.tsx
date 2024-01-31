import { Box, Flex } from '@chakra-ui/react'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { memo, useMemo } from 'react'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import type { ApiQuote } from 'state/apis/swapper'
import { selectInputBuyAsset } from 'state/slices/selectors'
import { getBuyAmountAfterFeesCryptoPrecision } from 'state/slices/tradeQuoteSlice/helpers'
import { selectActiveQuoteMeta } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  sortedQuotes: ApiQuote[]
  isLoading: boolean
  isSwapperFetching: Record<SwapperName, boolean>
}

export const TradeQuotes: React.FC<TradeQuotesProps> = memo(
  ({ sortedQuotes: _sortedQuotes, isLoading, isSwapperFetching }) => {
    const wallet = useWallet().state.wallet
    const { chainId: buyAssetChainId } = useAppSelector(selectInputBuyAsset)
    const isSnapInstalled = useIsSnapInstalled()
    const walletSupportsBuyAssetChain = useWalletSupportsChain({
      chainId: buyAssetChainId,
      wallet,
      isSnapInstalled,
    })
    const isBuyAssetChainSupported = walletSupportsBuyAssetChain

    const useReceiveAddressArgs = useMemo(
      () => ({
        fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
      }),
      [wallet],
    )
    const receiveAddress = useReceiveAddress(useReceiveAddressArgs)
    // TODO(gomes): buy chain not supported effectively means connecting MM/other EVM-only wallets and trying to get a THOR trade quote
    // This makes things not borked as it doesn't display quotes at all vs. stale quotes with the wrong symbol, but we may want to ditch the
    // destination param instead, to be able to get a quote, *if* and only if we can ensure proper guards are in place to never allow a memo without a destination
    const sortedQuotes = useMemo(() => {
      if (!isBuyAssetChainSupported && !receiveAddress) return []

      return _sortedQuotes
    }, [_sortedQuotes, isBuyAssetChainSupported, receiveAddress])

    const activeQuoteMeta = useAppSelector(selectActiveQuoteMeta)
    const bestQuoteData = sortedQuotes[0]?.errors.length === 0 ? sortedQuotes[0] : undefined

    const quotes = useMemo(() => {
      const bestTotalReceiveAmountCryptoPrecision = bestQuoteData?.quote
        ? getBuyAmountAfterFeesCryptoPrecision({
            quote: bestQuoteData.quote,
          })
        : undefined

      return sortedQuotes.map((quoteData, i) => {
        const { swapperName, quote, id } = quoteData

        const isActive = activeQuoteMeta !== undefined && activeQuoteMeta.identifier === id

        return (
          <TradeQuote
            isActive={isActive}
            isLoading={isLoading || isSwapperFetching[swapperName]}
            isBest={i === 0}
            key={quote?.id ?? i}
            quoteData={quoteData}
            bestTotalReceiveAmountCryptoPrecision={bestTotalReceiveAmountCryptoPrecision}
          />
        )
      })
    }, [activeQuoteMeta, bestQuoteData?.quote, isLoading, isSwapperFetching, sortedQuotes])

    // add some loading state per swapper so missing quotes have obvious explanation as to why they arent in the list
    // only show these placeholders when quotes aren't already visible in the list
    const fetchingSwappers = useMemo(() => {
      return Object.entries(isSwapperFetching)
        .filter(([_swapperName, isFetching]) => isFetching)
        .filter(
          ([swapperName, _isFetching]) =>
            !sortedQuotes.some(quoteData => quoteData.swapperName === swapperName),
        )
        .map(([swapperName, _isFetching]) => {
          const id = `${swapperName}-fetching`
          const quoteData = {
            id,
            quote: undefined,
            swapperName: swapperName as SwapperName,
            inputOutputRatio: 0,
            errors: [],
            warnings: [],
          }
          return (
            <TradeQuote
              isActive={false}
              isLoading={true}
              isBest={false}
              key={id}
              // eslint doesn't understand useMemo not possible to use inside map
              // eslint-disable-next-line react-memo/require-usememo
              quoteData={quoteData}
              bestTotalReceiveAmountCryptoPrecision={undefined}
            />
          )
        })
    }, [isSwapperFetching, sortedQuotes])

    return (
      <Box position='relative'>
        <Flex
          flexDir='column'
          width='full'
          px={2}
          pt={0}
          maxHeight={'500px'}
          overflowY='auto'
          pb={4}
          transitionProperty='max-height'
          transitionDuration='0.65s'
          transitionTimingFunction='ease-in-out'
          gap={2}
        >
          {quotes}
          {fetchingSwappers}
        </Flex>
      </Box>
    )
  },
)
