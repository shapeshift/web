import type { SimpleGridProps } from '@chakra-ui/react'
import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { NarwhalIcon } from 'components/Icons/Narwhal'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import { useGetNftUserTokensQuery } from 'state/apis/nft/nftApi'
import type { NftItem } from 'state/apis/nft/types'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { NftCard } from './NftCard'
import { NftChainFilter } from './NftChainFilter'
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
    px={{ base: 4, xl: 0 }}
    {...props}
  />
)

export const NftTable = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const accountIds = useAppSelector(selectWalletAccountIds)
  const { data: nftItems, isLoading } = useGetNftUserTokensQuery({ accountIds })

  const [chainFilters, setChainFilters] = useState<EvmChainId[]>([])

  const filterNftsBySearchTerm = useCallback((data: NftItem[], searchQuery: string) => {
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
    return isSearching && nftItems ? filterNftsBySearchTerm(nftItems, searchQuery) : nftItems
  }, [isSearching, nftItems, filterNftsBySearchTerm, searchQuery])

  const renderNftCards = useMemo(() => {
    if (!nftItems?.length) return null
    return filteredNfts?.map(nft => <NftCard nftAssetId={nft.assetId} key={nft.assetId} />)
  }, [nftItems?.length, filteredNfts])

  if (isLoading)
    return (
      <NftGrid>
        {Array.from({ length: 8 }).map((_, index) => (
          <NftCardLoading key={index} />
        ))}
      </NftGrid>
    )
  if (!isLoading && !nftItems?.length)
    return (
      <ResultsEmpty
        title='nft.emptyTitle'
        body='nft.emptyBody'
        icon={<NarwhalIcon color='pink.200' />}
      />
    )

  return (
    <>
      <Box mb={4} px={{ base: 4, xl: 0 }}>
        <Flex>
          <NftChainFilter
            resetFilters={() => {}}
            setFilters={({ chains }) => {
              setChainFilters(chains)
            }}
            hasAppliedFilter={false}
          />
          <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
        </Flex>
      </Box>
      {isSearching && !renderNftCards?.length ? (
        <SearchEmpty searchQuery={searchQuery} />
      ) : (
        <NftGrid>{renderNftCards}</NftGrid>
      )}
    </>
  )
}
