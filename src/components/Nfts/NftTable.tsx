import { Box, SimpleGrid } from '@chakra-ui/react'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import type { V2NftUserItem } from 'state/apis/zapper/client'
import { useGetZapperNftUserTokensQuery } from 'state/apis/zapper/zapperApi'

// import { selectWalletAccountIds } from 'state/slices/common-selectors'
// import { useAppSelector } from 'state/store'
import { NftCard } from './NftCard'

export const NftTable = () => {
  const [searchQuery, setSearchQuery] = useState('')

  // TODO(0xdef1cafe): remove - this is willywonka.eth
  const accountIds = ['eip155:1:0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c']
  // const accountIds = useAppSelector(selectWalletAccountIds)

  const { data, isLoading } = useGetZapperNftUserTokensQuery({ accountIds })

  const filterNftsBySearchTerm = useCallback((data: V2NftUserItem[], searchQuery: string) => {
    const search = searchQuery.trim().toLowerCase()
    const keys = [
      'token.name',
      'token.collection.name',
      'token.collection.address',
      'token.tokenId',
    ]
    return matchSorter(data, search, { keys })
  }, [])

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const filteredNfts = useMemo(() => {
    return isSearching && data ? filterNftsBySearchTerm(data, searchQuery) : data
  }, [isSearching, data, filterNftsBySearchTerm, searchQuery])

  const renderNftCards = useMemo(() => {
    if (!data?.length) return null
    return filteredNfts?.map(({ token }) => <NftCard zapperNft={token} />)
  }, [data?.length, filteredNfts])

  if (isLoading) return <div>Loading...</div>
  if (!isLoading && !data?.length) return <div>No NFTs found</div>

  return (
    <>
      <Box mb={4}>
        <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
      </Box>
      {isSearching && !renderNftCards?.length ? (
        <div>Empty search state</div>
      ) : (
        <SimpleGrid
          gridGap={4}
          gridTemplateColumns={{
            base: 'repeat(auto-fit, minmax(150px, 1fr))',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          }}
        >
          {renderNftCards}
        </SimpleGrid>
      )}
    </>
  )
}
