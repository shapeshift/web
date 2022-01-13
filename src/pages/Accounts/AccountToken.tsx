import { Flex } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

export type MatchParams = {
  accountId: AccountSpecifier
  assetId: CAIP19
}

export const AccountToken = () => {
  const { accountId, assetId } = useParams<MatchParams>()
  const caip19 = assetId ? decodeURIComponent(assetId) : null
  if (!caip19) return null
  return (
    <Page style={{ flex: 1 }} key={assetId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetAccountDetails assetId={caip19} accountId={accountId} />
      </Flex>
    </Page>
  )
}
