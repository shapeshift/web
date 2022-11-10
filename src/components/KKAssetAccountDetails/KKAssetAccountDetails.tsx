import { Flex, Link, Stack } from '@chakra-ui/react'
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
        <Flex height='20px' flexDirection='row' justifyContent='space-between'>
          <RawText fontWeight='bold'>RANK: {`${asset.rank}`}</RawText>
          <Link pb={6} fontWeight='bold' color='blue.500' isExternal href={asset.link}>
            Visit Coingecko Page
          </Link>
        </Flex>
        <RawText fontWeight='bold' pb={4}>
          MARKET CAP: {`$${asset.marketCap}`}
        </RawText>

        <DappGrid asset={asset} />
      </Stack>
    </Main>
  )
}
