import type { SimpleGridProps } from '@chakra-ui/react'
import { Box, SimpleGrid } from '@chakra-ui/react'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { NarwhalIcon } from 'components/Icons/Narwhal'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import type { V2NftUserItem } from 'state/apis/zapper/client'
import { useGetZapperNftUserTokensQuery } from 'state/apis/zapper/zapperApi'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { NftCard } from './NftCard'
import { NftCardLoading } from './NftLoadingCard'

const NftGrid: React.FC<SimpleGridProps> = props => (
  <SimpleGrid
    gridGap={4}
    gridTemplateColumns={{
      base: 'repeat(auto-fit, minmax(150px, 1fr))',
      sm: 'repeat(2, 1fr)',
      md: 'repeat(3, 1fr)',
      lg: 'repeat(4, 1fr)',
    }}
    {...props}
  />
)

export const NftTable = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const accountIds = useAppSelector(selectWalletAccountIds)
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

  if (isLoading)
    return (
      <NftGrid>
        {Array.from({ length: 8 }).map((_, index) => (
          <NftCardLoading key={index} />
        ))}
      </NftGrid>
    )
  if (!isLoading && !data?.length)
    return (
      <ResultsEmpty
        title='nft.emptyTitle'
        body='nft.emptyBody'
        icon={<NarwhalIcon color='pink.200' />}
      />
    )

  return (
    <>
      <Box mb={4}>
        <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
      </Box>
      {isSearching && !renderNftCards?.length ? (
        <SearchEmpty searchQuery={searchQuery} />
      ) : (
        <NftGrid>{renderNftCards}</NftGrid>
      )}
    </>
  )
}
