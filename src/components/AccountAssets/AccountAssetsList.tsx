import { Box, Button, Collapse, Stack, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import { FaArrowCircleDown, FaArrowCircleUp } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { AssetAccountRow } from '../AssetAccounts/AssetAccountRow'
/**
 * This returns the assets inside an account
 * @param assetIds An array of AssetIds for the account
 * @param accountId The AccountSpecifier for the account
 * @param limit If no limit is provided, all assets will be shown. If 0 is provided all assets will go into the more section.
 * @returns returns JSX
 */

type AccountAssetListProps = {
  assetIds: AssetId[]
  accountId: AccountSpecifier
  limit?: number
}
export const AccountAssetsList = ({ assetIds, accountId, limit }: AccountAssetListProps) => {
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()

  const featuredAssetIds = useMemo(() => {
    if (typeof limit === 'number') {
      if (assetIds && assetIds.length > limit) {
        return assetIds.slice(0, limit)
      } else {
        return assetIds
      }
    } else {
      return assetIds
    }
  }, [assetIds, limit])

  const moreAssetIds = useMemo(() => {
    if (typeof limit === 'number') {
      if (assetIds && assetIds.length > limit) {
        return assetIds.slice(limit)
      } else {
        return null
      }
    }
    return null
  }, [assetIds, limit])

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
        <>
          <Box mx={-6} width='auto' mb={-4}>
            <Button
              variant='link'
              p={4}
              borderTopRadius='none'
              colorScheme='blue'
              onClick={onToggle}
              width='full'
              rightIcon={isOpen ? <FaArrowCircleUp /> : <FaArrowCircleDown />}
            >
              {translate(`assets.assetCards.${isOpen ? 'hideTokens' : 'showTokens'}`, {
                amount: moreAssetIds.length,
              })}
            </Button>
          </Box>
          <Collapse in={isOpen}>
            <Stack mx={-4}>
              {moreAssetIds.map(assetId => (
                <AssetAccountRow assetId={assetId} key={assetId} accountId={accountId} />
              ))}
            </Stack>
          </Collapse>
        </>
      )}
    </>
  )
}
