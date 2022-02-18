import { Flex, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { AccountAssets } from 'components/AccountAssets/AccountAssets'
import { AssetAccounts } from 'components/AssetAccounts/AssetAccounts'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Page } from 'components/Layout/Page'
import { TxHistory } from 'components/TxHistory'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const CosmosAssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
  return (
    <Page style={{ width: '100%' }}>
      <Flex flexGrow={1} zIndex={2} flexDir={{ base: 'column', lg: 'row' }}>
        <Stack
          spacing='1.5rem'
          maxWidth={{ base: 'auto', lg: '50rem' }}
          flexBasis='50rem'
          p={{ base: 0, lg: 4 }}
          mx={{ base: 0, lg: 'auto' }}
        >
          <AssetHeader assetId={caip19} accountId={accountId} />
          {accountId && <AccountAssets assetId={caip19} accountId={accountId} />}
          <AssetAccounts assetId={caip19} accountId={accountId} />
          <TxHistory assetId={caip19} accountId={accountId} />
        </Stack>
      </Flex>
    </Page>
  )
}
