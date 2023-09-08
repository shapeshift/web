import { HStack, Link } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { isSome } from 'lib/utils'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
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
    <HStack justifyContent='space-between' spacing={4} alignItems='flex-start'>
      <Text translation='plugins.walletConnectToDapps.header.menu.address' color='text.subtle' />
      <Link href={`${feeAsset.explorerAddressLink}${address}`} isExternal color='text.info'>
        <MiddleEllipsis value={address} />
      </Link>
    </HStack>
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

  return (
    <>
      {feeAssetIds.map((props, i) => (
        <AddressLink key={i} {...props} />
      ))}
    </>
  )
}
