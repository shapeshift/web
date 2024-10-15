import { Card, Center, Flex, useMediaQuery } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { FormEvent } from 'react'
import type { TradeInputTab } from 'components/MultiHopTrade/types'
import { breakpoints } from 'theme/theme'

import { SharedTradeInputBody } from '../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputHeader } from '../SharedTradeInput/SharedTradeInputHeader'
import { WithLazyMount } from '../TradeInput/components/WithLazyMount'
import { useSharedHeight } from '../TradeInput/hooks/useSharedHeight'

type SharedTradeInputProps = {
  activeQuote: TradeQuote | undefined
  buyAmountAfterFeesCryptoPrecision: string | undefined
  buyAmountAfterFeesUserCurrency: string | undefined
  buyAsset: Asset
  hasUserEnteredAmount: boolean
  headerRightContent: JSX.Element
  buyAssetAccountId: AccountId | undefined
  sellAssetAccountId: AccountId | undefined
  isCompact: boolean | undefined
  isLoading: boolean
  manualReceiveAddress: string | undefined
  sellAsset: Asset
  sideComponent: React.ComponentType<any>
  tradeInputRef: React.RefObject<HTMLDivElement>
  tradeInputTab: TradeInputTab
  footerContent: JSX.Element
  handleSwitchAssets: () => void
  onChangeTab: (newTab: TradeInputTab) => void
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
  buyAssetAccountId,
  sellAssetAccountId,
  isCompact,
  isLoading,
  manualReceiveAddress,
  sellAsset,
  sideComponent,
  tradeInputTab,
  tradeInputRef,
  footerContent,
  handleSwitchAssets,
  onChangeTab,
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
      id='test-flex'
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
            initialTab={tradeInputTab}
            rightContent={headerRightContent}
            onChangeTab={onChangeTab}
          />
          <SharedTradeInputBody
            activeQuote={activeQuote}
            buyAmountAfterFeesCryptoPrecision={buyAmountAfterFeesCryptoPrecision}
            buyAmountAfterFeesUserCurrency={buyAmountAfterFeesUserCurrency}
            buyAsset={buyAsset}
            buyAssetAccountId={buyAssetAccountId}
            sellAssetAccountId={sellAssetAccountId}
            isLoading={isLoading}
            manualReceiveAddress={manualReceiveAddress}
            sellAsset={sellAsset}
            handleSwitchAssets={handleSwitchAssets}
            setBuyAsset={setBuyAsset}
            setBuyAssetAccountId={setBuyAssetAccountId}
            setSellAsset={setSellAsset}
            setSellAssetAccountId={setSellAssetAccountId}
          />
          {footerContent}
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
