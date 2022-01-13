import { Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { generatePath } from 'react-router'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  AccountSpecifier,
  selectPortfolioAccountById
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { AccountRow } from './AccountRow/AccountRow'
import { Card } from './Card/Card'

export const AccountTokens = ({
  caip19,
  accountId
}: {
  caip19: CAIP19
  accountId: AccountSpecifier
}) => {
  const accounts = useAppSelector(state => selectPortfolioAccountById(state, accountId))
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))
  if (asset.tokenId) return null
  return (
    <Card>
      <Card.Header>
        <Card.Heading>Account Tokens</Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack mx={-4}>
          {accounts &&
            accounts.length > 0 &&
            accounts.map(account => {
              const path = generatePath('/accounts/:accountId/:assetId', {
                accountId,
                assetId: account
              })
              return <AccountRow CAIP19={account} allocationValue={10} key={account} to={path} />
            })}
        </Stack>
      </Card.Body>
    </Card>
  )
}
