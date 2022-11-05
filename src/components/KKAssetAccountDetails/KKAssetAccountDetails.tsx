import { Link, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { RawText } from 'components/Text'
import type { KKAsset } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'

import { Main } from '../Layout/Main'
import { DappGrid } from './DappGrid'
import { KKAssetHeader } from './KKAssetHeader/KKAssetHeader'
type AssetDetailsProps = {
  asset: KKAsset
}

export const KKAssetAccountDetails = ({ asset }: AssetDetailsProps) => {
  const { kkVote } = useModal()

  const onVoteClick = useCallback(() => {
    kkVote.open({ geckoId: asset.geckoId })
  }, [asset.geckoId, kkVote])

  return (
    <Main titleComponent={<KKAssetHeader asset={asset} onVoteClick={onVoteClick} />}>
      <Stack>
        <RawText>RANK: {`${asset.rank}`}</RawText>
        <RawText>MARKET CAP: {`$${asset.marketCap}`}</RawText>
        <Link color='blue.400' isExternal href={asset.link}>
          Visit Coingecko Page
        </Link>
        <DappGrid asset={asset} />
      </Stack>
    </Main>
  )
}
