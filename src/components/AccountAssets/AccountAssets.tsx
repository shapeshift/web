import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainNamespace } from '@shapeshiftmonorepo/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftmonorepo/caip'

import { AccountAssetsList } from './AccountAssetsList'

import { Text } from '@/components/Text'
import { selectPortfolioAssetIdsByAccountIdExcludeFeeAsset } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AccountAssetsProps = {
  assetId: AssetId
  accountId: AccountId
}

const CHAIN_NAMESPACE_SUPPORTS_TOKENS: ChainNamespace[] = [
  CHAIN_NAMESPACE.Evm,
  CHAIN_NAMESPACE.CosmosSdk,
  CHAIN_NAMESPACE.Solana,
]

export const AccountAssets = ({ assetId, accountId }: AccountAssetsProps) => {
  const assetIds = useAppSelector(state =>
    selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, { accountId }),
  )
  const { chainNamespace } = fromAssetId(assetId)
  if (!CHAIN_NAMESPACE_SUPPORTS_TOKENS.includes(chainNamespace) || assetIds.length === 0)
    return null

  return (
    <Card>
      <CardHeader>
        <Heading as='h5'>
          <Text translation='assets.assetCards.accountTokens' />
        </Heading>
      </CardHeader>
      <CardBody pt={0}>
        <AccountAssetsList accountId={accountId} assetIds={assetIds} limit={5} />
      </CardBody>
    </Card>
  )
}
