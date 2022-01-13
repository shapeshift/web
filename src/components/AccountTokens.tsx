import { Button, Collapse, Stack, useDisclosure } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { FaArrowCircleDown } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { generatePath } from 'react-router'
import { Text } from 'components/Text'
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
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const assets = useAppSelector(state => selectPortfolioAccountById(state, accountId))
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))

  const featuredAssets = useMemo(() => {
    return assets && assets.length > 5 ? assets.slice(0, 5) : assets
  }, [assets])

  const moreAssets = useMemo(() => {
    return assets && assets.length > 5 ? assets.slice(5) : null
  }, [assets])

  // @TODO: This filters for ETH to not show tokens component on tokens
  if (asset.tokenId || !assets) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='assets.assetCards.accountTokens' />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack mx={-4}>
          {featuredAssets &&
            featuredAssets.length > 0 &&
            featuredAssets.map(asset => {
              const path = generatePath('/accounts/:accountId/:assetId', {
                accountId,
                assetId: asset
              })
              return <AccountRow CAIP19={asset} allocationValue={10} key={asset} to={path} />
            })}
        </Stack>
        {moreAssets && moreAssets.length > 0 && (
          <Collapse in={isOpen}>
            <Stack mx={-4}>
              {moreAssets.map(asset => {
                const path = generatePath('/accounts/:accountId/:assetId', {
                  accountId,
                  assetId: asset
                })
                return <AccountRow CAIP19={asset} allocationValue={10} key={asset} to={path} />
              })}
            </Stack>
          </Collapse>
        )}
      </Card.Body>
      {moreAssets && moreAssets.length > 0 && (
        <Card.Footer p={0}>
          <Button
            variant='link'
            p={4}
            borderTopRadius='none'
            colorScheme='blue'
            onClick={onToggle}
            isFullWidth
            rightIcon={<FaArrowCircleDown />}
          >
            {translate(`assets.assetCards.${isOpen ? 'hideTokens' : 'showTokens'}`)}
          </Button>
        </Card.Footer>
      )}
    </Card>
  )
}
