import { Button, Link } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AddressAndChainProps = {
  accountId: string
}
export const AddressAndChain: React.FC<AddressAndChainProps> = ({ accountId }) => {
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const accountAddress = accountIdToLabel(accountId)
  if (!feeAsset) return null
  return (
    <Button
      as={Link}
      size='xs'
      href={`${feeAsset.explorerAddressLink}/${accountAddress}`}
      isExternal
      leftIcon={<AssetIcon size='2xs' src={feeAsset.networkIcon ?? feeAsset.icon} />}
    >
      <MiddleEllipsis value={accountAddress} />
    </Button>
  )
}
