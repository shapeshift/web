import type { StackDirection } from '@chakra-ui/react'
import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { AccountAssets } from '../AccountAssets/AccountAssets'
import { AssetChart } from '../AssetHeader/AssetChart'
import { AssetDescription } from '../AssetHeader/AssetDescription'
import { AssetHeader } from '../AssetHeader/AssetHeader'
import { AssetMarketData } from '../AssetHeader/AssetMarketData'
import { Display } from '../Display'
import { Equity } from '../Equity/Equity'
import { Main } from '../Layout/Main'
import { MaybeChartUnavailable } from '../MaybeChartUnavailable'
import { RelatedAssets } from '../RelatedAssets/RelatedAssets'
import { EarnOpportunities } from '../StakingVaults/EarnOpportunities'
import { SpamWarningBanner } from './components/SpamWarningBanner'

import { AssetTransactionHistory } from '@/components/TransactionHistory/AssetTransactionHistory'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { StandaloneTrade } from '@/pages/Trade/StandaloneTrade'
import type { Route } from '@/Routes/helpers'
import { selectIsSpamMarkedByAssetId } from '@/state/slices/preferencesSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetDetailsProps = {
  assetId: AssetId
  accountId?: AccountId
  route?: Route
}

const direction: StackDirection = { base: 'column', xl: 'row' }
const maxWidth = { base: 'full', xl: 'sm' }
const display = { base: 'none', md: 'block' }
const contentPaddingY = { base: 0, md: 8 }

export const AssetAccountDetails = ({ assetId, accountId }: AssetDetailsProps) => {
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const isSpamMarked = useAppSelector(state => selectIsSpamMarkedByAssetId(state, assetId))
  console.log({ isSpamMarked })
  const assetIds = useMemo(() => [assetId], [assetId])

  const assetHeader = useMemo(
    () => <AssetHeader assetId={assetId} accountId={accountId} />,
    [assetId, accountId],
  )

  const nativeSellAssetId = useMemo(() => {
    return getChainAdapterManager().get(fromAssetId(assetId).chainId)?.getFeeAssetId()
  }, [assetId])

  return (
    <Main headerComponent={assetHeader} py={contentPaddingY} isSubPage>
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <AssetChart accountId={accountId} assetId={assetId} isLoaded={true} />
          <Display.Mobile>
            {isSpamMarked && <SpamWarningBanner assetId={assetId} mx={6} />}
          </Display.Mobile>
          <MaybeChartUnavailable assetIds={assetIds} />
          <Equity assetId={assetId} accountId={accountId} />
          {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
          <RelatedAssets assetId={assetId} />
          <EarnOpportunities assetId={assetId} accountId={accountId} />
          <AssetTransactionHistory limit={10} assetId={assetId} accountId={accountId} />
        </Stack>
        <Flex flexDir='column' flex='1 1 0%' width='full' maxWidth={maxWidth} gap={4}>
          <Flex display={display}>
            <StandaloneTrade
              isCompact
              defaultBuyAssetId={assetId}
              defaultSellAssetId={nativeSellAssetId}
            />
          </Flex>
          {marketData && <AssetMarketData assetId={assetId} />}
          <AssetDescription assetId={assetId} />
        </Flex>
      </Stack>
    </Main>
  )
}
