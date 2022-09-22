import { SearchIcon } from '@chakra-ui/icons'
import { Box, Center, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

import type { FiatRampAction, FiatRampAsset } from '../../FiatRampsCommon'
import { filterAssetsBySearchTerm } from '../../utils'
import { AssetList } from './AssetList'

type AssetSearchProps = {
  onClick: (asset: FiatRampAsset) => void
  type: FiatRampAction
  assets: FiatRampAsset[]
  loading: boolean
}

export const AssetSearch = ({ onClick, type, assets, loading }: AssetSearchProps) => {
  const [filteredAssets, setFilteredAssets] = useState<FiatRampAsset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  useEffect(
    () => setFilteredAssets(filterAssetsBySearchTerm(searchString, assets)),
    [assets, searching, searchString],
  )

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
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            pl={10}
            variant='filled'
          />
        </InputGroup>
      </Box>
      <Box flex={1} justifyContent='center'>
        {loading ? (
          <Center minH='200px' w='full'>
            <CircularProgress isIndeterminate />
          </Center>
        ) : (
          <AssetList
            mb='10'
            type={type}
            assets={searching ? filteredAssets : assets}
            handleClick={onClick}
          />
        )}
      </Box>
    </>
  )
}
