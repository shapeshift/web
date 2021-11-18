import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAssets } from 'state/slices/assetsSlice/assetsSlice'
import { fetchMarketCaps } from 'state/slices/marketDataSlice/marketDataSlice'

import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { marketCapLoadingStatus } from './selectors/marketCapLoadingStatus/marketCapLoadingStatus'
import { selectAndSortAssets } from './selectors/selectAndSortAssets/selectAndSortAssets'

type AssetSearchProps = {
  onClick: (asset: any) => void
  filterBy?: (asset: Asset[]) => Asset[]
}

export const AssetSearch = ({ onClick, filterBy }: AssetSearchProps) => {
  const dispatch = useDispatch()
  const assets = useSelector(selectAndSortAssets)
  const currentAssets = filterBy ? useMemo(() => filterBy(assets), [assets, filterBy]) : assets
  const [marketCapLoaded, marketCapLoading] = useSelector(marketCapLoadingStatus)
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: ''
    }
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  useEffect(() => {
    !currentAssets.length && dispatch(fetchAssets({ network: NetworkTypes.MAINNET }))
    !marketCapLoaded && !marketCapLoading && dispatch(fetchMarketCaps())
  }, [currentAssets, dispatch, marketCapLoaded, marketCapLoading])

  useEffect(() => {
    setFilteredAssets(searching ? filterAssetsBySearchTerm(searchString, currentAssets) : currentAssets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString])

  return (
    <>
      <Box as='form' mb={3} visibility='visible'>
        <InputGroup>
          <InputLeftElement pointerEvents='none'>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input
            {...register('search')}
            type='text'
            placeholder='Search'
            pl={10}
            variant='filled'
          />
        </InputGroup>
      </Box>
      <Box flex={1}>
        <AssetList mb='10' currentAssets={searching ? filteredAssets : currentAssets} handleClick={onClick} />
      </Box>
    </>
  )
}
