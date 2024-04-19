import { HStack, Link, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { accountIdToFeeAssetId, isSome } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AddressAndChainProps = {
  accountIds: string[]
}

const AddressLink = ({ feeAssetId, accountId }: { feeAssetId: AssetId; accountId: string }) => {
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const { account: address } = fromAccountId(accountId)
  if (!feeAsset) return null
  return (
    <Link href={`${feeAsset.explorerAddressLink}${address}`} isExternal color='text.info'>
      <MiddleEllipsis value={address} />
    </Link>
  )
}

// renders all unique links for a given set of account ids - actual addresses may not be unique though
export const AddressLinks: React.FC<AddressAndChainProps> = ({ accountIds }) => {
  const feeAssetIds = useMemo(
    () =>
      Array.from(
        new Set(
          accountIds
            .map(accountId => {
              const feeAssetId = accountIdToFeeAssetId(accountId)
              if (!feeAssetId) return undefined
              return { feeAssetId, accountId }
            })
            .filter(isSome),
        ),
      ),
    [accountIds],
  )

  const addressLabel = useMemo(() => {
    return feeAssetIds.length > 1
      ? 'plugins.walletConnectToDapps.header.menu.addresses'
      : 'plugins.walletConnectToDapps.header.menu.address'
  }, [feeAssetIds.length])

  return (
    <HStack justifyContent='space-between' spacing={4} alignItems='flex-start'>
      <Text translation={addressLabel} color='text.subtle' />
      <Stack alignItems='center' justifyContent='flex-end' flexWrap='wrap'>
        {feeAssetIds.map((props, i) => (
          <AddressLink key={i} {...props} />
        ))}
      </Stack>
    </HStack>
  )
}
