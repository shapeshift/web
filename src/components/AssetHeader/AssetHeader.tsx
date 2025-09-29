import type { ContainerProps } from '@chakra-ui/react'
import { Flex, Heading } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'
import { useMemo } from 'react'

import { AssetActions } from './AssetActions'

import { AssetIcon } from '@/components/AssetIcon'
import { Display } from '@/components/Display'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { SEO } from '@/components/Layout/Seo'
import { ScrollDisplay } from '@/components/ScrollDisplay'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { middleEllipsis } from '@/lib/utils'
import {
  selectAccountIdsByAssetId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetHeaderProps = {
  assetId?: AssetId
  accountId?: AccountId
} & ContainerProps

const displayMdFlex = { base: 'none', md: 'flex' }
const fontSizeMd2xl = { base: 'xl', md: '2xl' }

export const AssetHeader: React.FC<AssetHeaderProps> = ({ assetId, accountId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const chainId = asset.chainId
  const accountIdsFilter = useMemo(() => ({ assetId: assetId ?? '' }), [assetId])
  const accountIds = useAppSelector(
    state => selectAccountIdsByAssetId(state, accountIdsFilter),
    isEqual,
  )
  const singleAccount = accountIds && accountIds.length === 1 ? accountIds[0] : undefined
  const { name, symbol } = asset || {}

  const {
    state: { wallet },
  } = useWallet()

  const canDisplayAssetActions = useWalletSupportsChain(chainId, wallet)

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoBalance =
    useAppSelector(state => selectPortfolioCryptoPrecisionBalanceByFilter(state, filter)) ?? '0'

  const formattedPrice = toFiat(marketData?.price ?? '0')

  if (!chainId) return null
  if (!assetId) return null

  return (
    <PageHeader>
      <SEO title={`${asset.symbol} - ${formattedPrice}`} description={asset.description} />
      <PageHeader.Left>
        <Display.Desktop>
          <Flex alignItems='center' mr='auto' flex={1}>
            <AssetIcon assetId={asset.assetId} />
            <Flex ml={3} textAlign='left' gap={2} alignItems='center'>
              <Heading fontSize={fontSizeMd2xl} lineHeight='shorter'>
                {name} {`(${symbol}${asset.id ? ` ${middleEllipsis(asset.id)}` : ''})`}
              </Heading>
            </Flex>
          </Flex>
        </Display.Desktop>
        <Display.Mobile>
          <PageBackButton />
        </Display.Mobile>
      </PageHeader.Left>
      <PageHeader.Middle>
        <Display.Mobile>
          <ScrollDisplay>
            <ScrollDisplay.Default>
              <RawText>{asset.name}</RawText>
            </ScrollDisplay.Default>
            <ScrollDisplay.OutOfView>{formattedPrice}</ScrollDisplay.OutOfView>
          </ScrollDisplay>
        </Display.Mobile>
      </PageHeader.Middle>
      <PageHeader.Right>
        <Display.Desktop>
          {canDisplayAssetActions ? (
            <Flex display={displayMdFlex}>
              <AssetActions
                assetId={assetId}
                accountId={accountId ? accountId : singleAccount}
                cryptoBalance={cryptoBalance}
              />
            </Flex>
          ) : null}
        </Display.Desktop>
      </PageHeader.Right>
    </PageHeader>
  )
}
