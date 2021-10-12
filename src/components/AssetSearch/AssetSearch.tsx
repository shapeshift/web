import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import sortBy from 'lodash/sortBy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getAssetService } from 'lib/assetService'

import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'

type AssetSearchProps = {
  onClick: (asset: any) => void
}

export const AssetSearch = ({ onClick }: AssetSearchProps) => {
  const [sortedAssets, setSortedAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: ''
    }
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  const fetchTokens = useCallback(async () => {
    try {
      const assetService = await getAssetService()
      const data = assetService?.byNetwork(NetworkTypes.MAINNET)
      const sorted = sortBy(data, ['name', 'symbol'])
      setSortedAssets(sorted)
    } catch (e) {
      console.warn(e)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setFilteredAssets(
      searching ? filterAssetsBySearchTerm(searchString, sortedAssets) : sortedAssets
    )
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
        <AssetList
          mb='10'
          assets={searching ? filteredAssets : sortedAssets}
          handleClick={onClick}
        />
      </Box>
    </>
  )
}
