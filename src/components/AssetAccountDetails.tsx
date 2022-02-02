import { Flex, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Page } from 'components/Layout/Page'
import { TxHistory } from 'components/TxHistory'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { AccountAssets } from './AccountAssets/AccountAssets'
import { AssetAccounts } from './AssetAccounts/AssetAccounts'
import { AssetHeader } from './AssetHeader/AssetHeader'
import { EarnOpportunities } from './StakingVaults/EarnOpportunities'
import { UnderlyingToken } from './UnderlyingToken'
import { StakingOpportunities } from './Delegate/StakingOpportunities'

type AssetDetailsProps = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const AssetAccountDetails = ({ assetId: caip19, accountId }: AssetDetailsProps) => {
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
          <EarnOpportunities assetId={caip19} accountId={accountId} />
          <StakingOpportunities assetId={caip19} accountId={accountId} />
          <UnderlyingToken assetId={caip19} accountId={accountId} />
          <TxHistory assetId={caip19} accountId={accountId} />
        </Stack>
      </Flex>
    </Page>
  )
}
