import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { logger } from 'lib/logger'
import { selectAssetsByMarketCap } from 'state/slices/selectors'

import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'

const moduleLogger = logger.child({
  namespace: ['AssetSearch'],
})

type AssetSearchProps = {
  onClick: (asset: any) => void
  filterBy?: (asset: Asset[]) => Asset[] | undefined
}

export const AssetSearch = ({ onClick, filterBy }: AssetSearchProps) => {
  const assets = useSelector(selectAssetsByMarketCap)
  const currentAssets = useMemo(() => (filterBy ? filterBy(assets) : assets), [assets, filterBy])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  useEffect(() => {
    if (currentAssets) {
      setFilteredAssets(
        searching ? filterAssetsBySearchTerm(searchString, currentAssets) : currentAssets,
      )
    } else {
      moduleLogger.error('currentAssets not defined')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString])

  const listAssets = searching ? filteredAssets : currentAssets

  return (
    <>
      <Box
        as='form'
        mb={3}
        px={4}
        visibility='visible'
        onSubmit={(e: FormEvent<unknown>) => e.preventDefault()}
      >
        <InputGroup size='lg'>
          <InputLeftElement pointerEvents='none'>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input
            {...register('search')}
            type='text'
            placeholder='Search'
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            pl={10}
            variant='filled'
            autoComplete='off'
          />
        </InputGroup>
      </Box>
      {listAssets && (
        <Box flex={1}>
          <AssetList mb='10' assets={listAssets} handleClick={onClick} />
        </Box>
      )}
    </>
  )
}
