import { SearchIcon } from '@chakra-ui/icons'
import { Box, Center, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import { getConfig } from 'config'
import { concat, flatten, uniqBy } from 'lodash'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

import { BuySellAction } from '../../BuySell'
import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm'

type AssetSearchProps = {
  onClick: (asset: any) => void
  type: BuySellAction
}

export const AssetSearch = ({ onClick, type = BuySellAction.Buy }: AssetSearchProps) => {
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: ''
    }
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  const [loading, setLoading] = useState(false)
  const [currentAssets, setCurrentAssets] = useState<any[]>([])

  const getCoinifySupportedCurrencies = async () => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
    }
  }

  const getWyreSupportedCurrencies = async () => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
    }
  }
  //Filter for the assets you can buy
  const buyFilter = (asset: { transaction_direction: string }) =>
    asset.transaction_direction === 'bank_blockchain' ||
    asset.transaction_direction === 'card_blockchain'

  // Filter for the assets you can sell
  const sellFilter = (asset: { transaction_direction: string }) =>
    asset.transaction_direction === 'blockchain_bank'

  //Filter and merge function
  const filterAndMerge = useMemo(
    () => (coinifyList: any[], wyreList: any[], key: string | number, filter: any) => {
      const list1 = coinifyList
        .filter(filter)
        .map((list: { [x: string]: { currencies: any } }) => list[key].currencies)
      const list2 = wyreList
        .filter(filter)
        .map((list: { [x: string]: { currencies: any } }) => list[key].currencies)
      const results = uniqBy(flatten(concat(list1, list2)), 'gem_asset_id')
      return results
    },
    []
  )

  const fetchSupportedCoins = async () => {
    setLoading(true)

    try {
      const coinifyList = await getCoinifySupportedCurrencies()
      const wyreList = await getWyreSupportedCurrencies()
      const buyList = filterAndMerge(coinifyList, wyreList, 'destination', buyFilter)
      const sellList = filterAndMerge(coinifyList, wyreList, 'source', sellFilter)
      if (type === BuySellAction.Buy) {
        setCurrentAssets(buyList)
      } else {
        setCurrentAssets(sellList)
      }
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupportedCoins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <Box flex={1} justifyContent='center'>
        {loading ? (
          <Center minH='200px' w='full'>
            <CircularProgress isIndeterminate />
          </Center>
        ) : (
          <AssetList
            mb='10'
            assets={searching ? filteredAssets : currentAssets}
            handleClick={onClick}
          />
        )}
      </Box>
    </>
  )
}
