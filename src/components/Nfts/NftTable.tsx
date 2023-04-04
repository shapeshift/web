import { Box } from '@chakra-ui/react'
import { useGetZapperNftUserTokensQuery } from 'state/apis/zapper/zapperApi'

import { NftCard } from './NftCard'

export const NftTable = () => {
  // TODO(0xdef1cafe): remove - this is willywonka.eth
  const accountIds = ['eip155:1:0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c']
  // const accountIds = useAppSelector(selectWalletAccountIds)
  const { data } = useGetZapperNftUserTokensQuery({ accountIds })

  if (!data?.length) return null

  return (
    <Box display='flex' flexWrap='wrap'>
      {data.map(({ token }) => (
        <NftCard zapperNft={token} />
      ))}
    </Box>
  )
}
