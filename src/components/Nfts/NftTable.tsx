import { SimpleGrid } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useGetZapperNftUserTokensQuery } from 'state/apis/zapper/zapperApi'

import { NftCard } from './NftCard'

export const NftTable = () => {
  // TODO(0xdef1cafe): remove - this is willywonka.eth
  const accountIds = ['eip155:1:0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c']
  // const accountIds = useAppSelector(selectWalletAccountIds)
  const { data } = useGetZapperNftUserTokensQuery({ accountIds })

  const renderNftCards = useMemo(() => {
    if (!data?.length) return null
    return data.map(({ token }) => <NftCard zapperNft={token} />)
  }, [data])

  if (!data?.length) return null

  return (
    <SimpleGrid gridGap={4} gridTemplateColumns='repeat(auto-fit, minmax(150px, 1fr))'>
      {renderNftCards}
    </SimpleGrid>
  )
}
