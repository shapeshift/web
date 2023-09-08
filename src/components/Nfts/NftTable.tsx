import type { SimpleGridProps } from '@chakra-ui/react'
import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { NarwhalIcon } from 'components/Icons/Narwhal'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import {
  selectGetNftUserTokensPending,
  selectPortfolioNftItemsWithCollection,
} from 'state/apis/nft/selectors'
import type { NftItemWithCollection } from 'state/apis/nft/types'
import { useAppSelector } from 'state/store'

import { NftCard } from './NftCard'
import { NftCardLoading } from './NftLoadingCard'
import { NftNetworkFilter } from './NftNetworkFilter'

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

  const [networkFilters, setNetworkFilters] = useState<ChainId[]>([])

  const isLoading = useAppSelector(selectGetNftUserTokensPending)
  const nftItems = useAppSelector(selectPortfolioNftItemsWithCollection)

  const availableChainIds = useMemo(
    () =>
      nftItems.reduce<ChainId[]>((acc, nftItem) => {
        if (!acc.includes(nftItem.chainId)) {
          acc.push(nftItem.chainId)
        }
        return acc
      }, []),
    [nftItems],
  )

  const filterNftsBySearchTerm = useCallback(
    (data: NftItemWithCollection[], searchQuery: string) => {
      const search = searchQuery.trim().toLowerCase()
      const keys = ['name', 'collection.name', 'collection.assetId', 'assetId', 'id']

      const maybeFilteredByChainId = networkFilters.length
        ? data.filter(nftItem => networkFilters.includes(nftItem.chainId))
        : data

      // Don't use matchSorter if there is no need to - it's expensive, and will rug the initial sorting
      // resulting in perceived borked order when filtering by chain vs. no filter applied
      return search ? matchSorter(maybeFilteredByChainId, search, { keys }) : maybeFilteredByChainId
    },
    [networkFilters],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const filteredNfts = useMemo(() => {
    return (isSearching || networkFilters.length) && nftItems
      ? filterNftsBySearchTerm(nftItems, searchQuery)
      : nftItems
  }, [isSearching, networkFilters.length, nftItems, filterNftsBySearchTerm, searchQuery])

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
        <Flex gap={2}>
          <NftNetworkFilter
            availableChainIds={availableChainIds}
            resetFilters={() => setNetworkFilters([])}
            setFilters={({ network: networks }: { network?: ChainId[] }) => {
              if (!networks?.length) return setNetworkFilters([])
              setNetworkFilters(networks)
            }}
            hasAppliedFilter={Boolean(networkFilters.length)}
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
