import { Stack } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ClaimableToken } from 'lib/investor/investor-idle'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ClaimableAssetProps = {
  token: Omit<ClaimableToken, 'address'>
}

export const ClaimableAsset: React.FC<ClaimableAssetProps> = ({ token }) => {
  const asset = useAppSelector(state => selectAssetById(state, token.assetId))
  if (!asset) return null
  return (
    <Stack direction='row' alignItems='center' justifyContent='center' key={token.assetId}>
      <AssetIcon boxSize='8' src={asset.icon} />
      <Amount.Crypto
        fontSize='lg'
        fontWeight='medium'
        value={bnOrZero(token.amount).div(`1e+${asset.precision}`).toString()}
        symbol={asset?.symbol}
      />
    </Stack>
  )
}
