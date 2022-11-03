import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { FormEvent } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import type { FiatRampAction } from '../../FiatRampsCommon'
import { filterAssetsBySearchTerm } from '../../utils'
import { AssetList } from './AssetList'

type AssetSearchProps = {
  onClick: (assetId: AssetId) => void
  action: FiatRampAction
  assetIds: AssetId[]
}

export const AssetSearch: React.FC<AssetSearchProps> = ({ onClick, action, assetIds }) => {
  const translate = useTranslate()
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })

  const search = watch('search')

  const filteredAssetIds = useMemo(
    () => filterAssetsBySearchTerm(search, assetIds),
    [assetIds, search],
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
            placeholder={translate('common.search')}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            autoComplete='off'
            pl={10}
            variant='filled'
          />
        </InputGroup>
      </Box>
      <Box flex={1} justifyContent='center'>
        <AssetList mb='10' action={action} assetIds={filteredAssetIds} handleClick={onClick} />
      </Box>
    </>
  )
}
