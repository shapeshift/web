import { Box, Button, Collapse, Stack, useDisclosure } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { FaArrowCircleDown, FaArrowCircleUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { AssetAccountRow } from '../AssetAccounts/AssetAccountRow'

export const AccountAssetsList = ({
  assetIds,
  accountId,
  limit
}: {
  assetIds: CAIP19[]
  accountId: AccountSpecifier
  limit?: number
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()

  const featuredAssetIds = useMemo(() => {
    return limit === 0 || limit
      ? assetIds && assetIds.length > limit
        ? assetIds.slice(0, limit)
        : assetIds
      : assetIds
  }, [assetIds, limit])

  const moreAssetIds = useMemo(() => {
    return limit === 0 || limit
      ? assetIds && assetIds.length > limit
        ? assetIds.slice(limit)
        : null
      : null
  }, [assetIds, limit])

  // @TODO: This filters for ETH to not show tokens component on tokens
  if (assetIds.length === 0) return null

  return (
    <>
      {featuredAssetIds && featuredAssetIds.length > 0 && (
        <Stack mx={-4}>
          {featuredAssetIds.map(assetId => {
            return <AssetAccountRow assetId={assetId} key={assetId} accountId={accountId} />
          })}
        </Stack>
      )}
      {moreAssetIds && moreAssetIds.length > 0 && (
        <Collapse in={isOpen}>
          <Stack mx={-4}>
            {moreAssetIds.map(assetId => (
              <AssetAccountRow assetId={assetId} key={assetId} accountId={accountId} />
            ))}
          </Stack>
        </Collapse>
      )}
      {moreAssetIds && moreAssetIds.length > 0 && (
        <Box mx={-6} width='auto' mb={-4}>
          <Button
            variant='link'
            p={4}
            borderTopRadius='none'
            colorScheme='blue'
            onClick={onToggle}
            isFullWidth
            rightIcon={isOpen ? <FaArrowCircleUp /> : <FaArrowCircleDown />}
          >
            {translate(`assets.assetCards.${isOpen ? 'hideTokens' : 'showTokens'}`, {
              amount: moreAssetIds.length
            })}
          </Button>
        </Box>
      )}
    </>
  )
}
