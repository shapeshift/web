import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement, SlideFade } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import { debounce } from 'lodash'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import { filterAssetsBySearchTerm } from 'components/AssetSearch/helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { AssetList } from 'components/AssetSearchKK/AssetList'
import { mergeKKAssets } from 'components/AssetSearchKK/AssetSearchKK'
import { Card } from 'components/Card/Card'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { selectAssetsByMarketCap } from 'state/slices/selectors'

type AssetSearchProps = {
  filterBy?: (asset: Asset[]) => Asset[]
}

export const AutoCompleteSearch = ({ filterBy }: AssetSearchProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const history = useHistory()

  const webAssets = useSelector(selectAssetsByMarketCap)
  const { getKeepkeyAssets } = useKeepKey()
  const kkAssets = getKeepkeyAssets()

  const assets = useMemo(() => mergeKKAssets(webAssets, kkAssets), [webAssets, kkAssets])

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
    setFilteredAssets(
      searching ? filterAssetsBySearchTerm(searchString, currentAssets) : currentAssets,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString])

  const debounceBlur = debounce(() => setIsFocused(false), 150)

  const handleClick = (asset: Asset) => {
    const isKeepkeyAsset = asset.assetId.startsWith('keepkey')

    const routeAssetId = isKeepkeyAsset ? `${asset.chainId}/${asset.assetId}` : asset.assetId

    // AssetId has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = !isKeepkeyAsset ? `/assets/${routeAssetId}` : `/assets/keepkey/${routeAssetId}`
    history.push({ pathname: url })
    setIsFocused(false)
  }

  return (
    <Box position='relative' maxWidth='xl'>
      <Box
        as='form'
        width='full'
        visibility='visible'
        onSubmit={(e: FormEvent<unknown>) => e.preventDefault()}
      >
        <InputGroup size='lg'>
          {/* Override zIndex to prevent element deplaying on overlay components */}
          <InputLeftElement pointerEvents='none' zIndex={1}>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input
            {...register('search')}
            type='text'
            placeholder='Search'
            variant='filled'
            onFocus={() => setIsFocused(true)}
            onBlur={debounceBlur}
            autoComplete='off'
          />
        </InputGroup>
      </Box>
      {isFocused && (
        <SlideFade in={isFocused}>
          <Card position='absolute' width='100%' mt={2} zIndex='banner'>
            <Card.Body p={2}>
              <Box flex={1} height={300}>
                <AssetList
                  mb='10'
                  assets={searching ? filteredAssets : currentAssets}
                  handleClick={handleClick}
                />
              </Box>
            </Card.Body>
          </Card>
        </SlideFade>
      )}
    </Box>
  )
}
