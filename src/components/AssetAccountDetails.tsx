import type { StackDirection } from '@chakra-ui/react'
import { Flex, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router-dom'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetChart } from './AssetHeader/AssetChart'
import { AssetDescription } from './AssetHeader/AssetDescription'
import { AssetHeader } from './AssetHeader/AssetHeader'
import { AssetMarketData } from './AssetHeader/AssetMarketData'
import { Equity } from './Equity/Equity'
import { Main } from './Layout/Main'
import { MaybeChartUnavailable } from './MaybeChartUnavailable'
import { LimitOrderRoutePaths } from './MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from './MultiHopTrade/components/TradeInput/components/Claim/types'
import { TradeInputTab, TradeRoutePaths } from './MultiHopTrade/types'
import { RelatedAssets } from './RelatedAssets/RelatedAssets'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'

import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { AssetTransactionHistory } from '@/components/TransactionHistory/AssetTransactionHistory'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { Route } from '@/Routes/helpers'
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
  const history = useHistory()
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const assetIds = useMemo(() => [assetId], [assetId])

  const assetHeader = useMemo(
    () => <AssetHeader assetId={assetId} accountId={accountId} />,
    [assetId, accountId],
  )

  const nativeSellAssetId = useMemo(() => {
    return getChainAdapterManager().get(fromAssetId(assetId).chainId)?.getFeeAssetId()
  }, [assetId])

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(LimitOrderRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          history.push(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [history],
  )

  return (
    <Main headerComponent={assetHeader} py={contentPaddingY} isSubPage>
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <AssetChart accountId={accountId} assetId={assetId} isLoaded={true} />
          <MaybeChartUnavailable assetIds={assetIds} />
          <Equity assetId={assetId} accountId={accountId} />
          {accountId && <AccountAssets assetId={assetId} accountId={accountId} />}
          <RelatedAssets assetId={assetId} />
          <EarnOpportunities assetId={assetId} accountId={accountId} />
          <AssetTransactionHistory limit={10} assetId={assetId} accountId={accountId} />
        </Stack>
        <Flex flexDir='column' flex='1 1 0%' width='full' maxWidth={maxWidth} gap={4}>
          <Flex display={display}>
            <MultiHopTrade
              isCompact
              defaultBuyAssetId={assetId}
              defaultSellAssetId={nativeSellAssetId}
              onChangeTab={handleChangeTab}
            />
          </Flex>
          {marketData && <AssetMarketData assetId={assetId} />}
          <AssetDescription assetId={assetId} />
        </Flex>
      </Stack>
    </Main>
  )
}
