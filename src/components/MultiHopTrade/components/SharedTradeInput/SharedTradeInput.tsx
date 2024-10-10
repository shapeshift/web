import { Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { FormEvent } from 'react'
import { TradeInputTab } from 'components/MultiHopTrade/types'
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
  buyAmountAfterFeesCryptoPrecision,
  buyAmountAfterFeesUserCurrency,
  buyAsset,
  hasUserEnteredAmount,
  headerRightContent,
  initialBuyAssetAccountId,
  initialSellAssetAccountId,
  isCompact,
  isLoading,
  manualReceiveAddress,
  sellAsset,
  sideComponent,
  tradeInputRef,
  walletReceiveAddress,
  handleSwitchAssets,
  onSubmit,
  setBuyAsset,
  setBuyAssetAccountId,
  setSellAsset,
  setSellAssetAccountId,
}) => {
  const totalHeight = useSharedHeight(tradeInputRef)
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

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
            rightContent={headerRightContent}
          />
          <SharedTradeInputBody
            activeQuote={activeQuote}
            buyAmountAfterFeesCryptoPrecision={buyAmountAfterFeesCryptoPrecision}
            buyAmountAfterFeesUserCurrency={buyAmountAfterFeesUserCurrency}
            buyAsset={buyAsset}
            initialBuyAssetAccountId={initialBuyAssetAccountId}
            initialSellAssetAccountId={initialSellAssetAccountId}
            isLoading={isLoading}
            manualReceiveAddress={manualReceiveAddress}
            sellAsset={sellAsset}
            handleSwitchAssets={handleSwitchAssets}
            setBuyAsset={setBuyAsset}
            setBuyAssetAccountId={setBuyAssetAccountId}
            setSellAsset={setSellAsset}
            setSellAssetAccountId={setSellAssetAccountId}
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
