import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAssets } from 'state/slices/assetsSlice/assetsSlice'

import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { selectAndSortAssets } from './selectors/selectAndSortAssets/selectAndSortAssets'

type AssetSearchProps = {
  onClick: (asset: any) => void
}

export const AssetSearch = ({ onClick }: AssetSearchProps) => {
  const dispatch = useDispatch()
  const assets = useSelector(selectAndSortAssets)
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
    dispatch(fetchAssets({ network: NetworkTypes.MAINNET }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  useEffect(() => {
    setFilteredAssets(searching ? filterAssetsBySearchTerm(searchString, assets) : assets)
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
        <AssetList mb='10' assets={searching ? filteredAssets : assets} handleClick={onClick} />
      </Box>
    </>
  )
}
