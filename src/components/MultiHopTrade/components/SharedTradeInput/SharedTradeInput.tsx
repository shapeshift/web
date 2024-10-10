import { Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { FormEvent } from 'react'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { TradeInputTab, TradeRoutePaths } from 'components/MultiHopTrade/types'
import { breakpoints } from 'theme/theme'

import { SharedTradeInputBody } from '../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'
import { ConfirmSummary } from '../TradeInput/components/ConfirmSummary'
import { WithLazyMount } from '../TradeInput/components/WithLazyMount'
import { useSharedHeight } from '../TradeInput/hooks/useSharedHeight'

type SharedTradeInputProps = {
  activeQuote: TradeQuote | undefined
  buyAmountAfterFeesCryptoPrecision: string | undefined
  buyAmountAfterFeesUserCurrency: string | undefined
  buyAsset: Asset
  hasUserEnteredAmount: boolean
  headerRightContent: JSX.Element
  initialBuyAssetAccountId: AccountId | undefined
  initialSellAssetAccountId: AccountId | undefined
  isCompact: boolean | undefined
  isLoading: boolean
  manualReceiveAddress: string | undefined
  sellAsset: Asset
  sideComponent: React.ComponentType<any>
  tradeInputRef: React.RefObject<HTMLDivElement>
  walletReceiveAddress: string | undefined
  handleSwitchAssets: () => void
  onSubmit: (e: FormEvent<unknown>) => void
  setBuyAsset: (asset: Asset) => void
  setBuyAssetAccountId: (accountId: string) => void
  setSellAsset: (asset: Asset) => void
  setSellAssetAccountId: (accountId: string) => void
}

export const SharedTradeInput: React.FC<SharedTradeInputProps> = ({
  activeQuote,
  isCompact,
  tradeInputRef,
  isLoading,
  onSubmit,
  sideComponent,
  buyAsset,
  sellAsset,
  setBuyAsset,
  setSellAsset,
  handleSwitchAssets,
  hasUserEnteredAmount,
  manualReceiveAddress,
  initialSellAssetAccountId,
  initialBuyAssetAccountId,
  setSellAssetAccountId,
  setBuyAssetAccountId,
  buyAmountAfterFeesCryptoPrecision,
  buyAmountAfterFeesUserCurrency,
  walletReceiveAddress,
  headerRightContent,
}) => {
  const history = useHistory()
  const totalHeight = useSharedHeight(tradeInputRef)
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      if (newTab === TradeInputTab.Claim) {
        history.push(TradeRoutePaths.Claim)
      }
    },
    [history],
  )

  return (
    <Flex
      width='full'
      justifyContent='center'
      maxWidth={isCompact || isSmallerThanXl ? '500px' : undefined}
    >
      <Center width='inherit'>
        <Card
          flex={1}
          width='full'
          maxWidth='500px'
          ref={tradeInputRef}
          as='form'
          onSubmit={onSubmit}
        >
          <SharedTradeInputHeader
            initialTab={TradeInputTab.Trade}
            onChangeTab={handleChangeTab}
            rightContent={headerRightContent}
          />
          <SharedTradeInputBody
            activeQuote={activeQuote}
            buyAmountAfterFeesCryptoPrecision={buyAmountAfterFeesCryptoPrecision}
            buyAmountAfterFeesUserCurrency={buyAmountAfterFeesUserCurrency}
            isLoading={isLoading}
            manualReceiveAddress={manualReceiveAddress}
            initialSellAssetAccountId={initialSellAssetAccountId}
            initialBuyAssetAccountId={initialBuyAssetAccountId}
            setSellAssetAccountId={setSellAssetAccountId}
            setBuyAssetAccountId={setBuyAssetAccountId}
            buyAsset={buyAsset}
            sellAsset={sellAsset}
            setBuyAsset={setBuyAsset}
            setSellAsset={setSellAsset}
            handleSwitchAssets={handleSwitchAssets}
          />
          <ConfirmSummary
            isCompact={isCompact}
            isLoading={isLoading}
            receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
          />
        </Card>
        <WithLazyMount
          shouldUse={!isCompact && !isSmallerThanXl}
          component={sideComponent}
          isOpen={!isCompact && !isSmallerThanXl && hasUserEnteredAmount}
          isLoading={isLoading}
          width={tradeInputRef.current?.offsetWidth ?? 'full'}
          height={totalHeight ?? 'full'}
          ml={4}
        />
      </Center>
    </Flex>
  )
}
