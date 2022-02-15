import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { selectAssetsByMarketCap } from 'state/slices/selectors'

import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'

type AssetSearchProps = {
  onClick: (asset: any) => void
  filterBy?: (asset: Asset[]) => Asset[]
}

export const AssetSearch = ({ onClick, filterBy }: AssetSearchProps) => {
  const assets = useSelector(selectAssetsByMarketCap)
  const currentAssets = useMemo(() => (filterBy ? filterBy(assets) : assets), [assets, filterBy])
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
    setFilteredAssets(
      searching ? filterAssetsBySearchTerm(searchString, currentAssets) : currentAssets
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString])

  return (
    <>
      <Box
        as='form'
        mb={3}
        visibility='visible'
        onSubmit={(e: FormEvent<unknown>) => e.preventDefault()}
      >
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
          assets={searching ? filteredAssets : currentAssets}
          handleClick={onClick}
        />
      </Box>
    </>
  )
}
