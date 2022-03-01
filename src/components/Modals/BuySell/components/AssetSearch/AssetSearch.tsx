import { SearchIcon } from '@chakra-ui/icons'
import { Box, Center, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import axios from 'axios'
import { getConfig } from 'config'
import { concat, flatten, uniqBy } from 'lodash'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { selectPortfolioCryptoHumanBalanceBySymbol } from 'state/slices/selectors'

import {
  BuySellAction,
  CurrencyAsset,
  SupportedCurrency,
  TransactionDirection
} from '../../BuySell'
import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm'

type AssetSearchProps = {
  onClick: (asset: CurrencyAsset) => void
  type: BuySellAction
}

export const AssetSearch = ({ onClick, type = BuySellAction.Buy }: AssetSearchProps) => {
  const [filteredAssets, setFilteredAssets] = useState<CurrencyAsset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: ''
    }
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  const [loading, setLoading] = useState(false)
  const [currentAssets, setCurrentAssets] = useState<CurrencyAsset[]>([])
  const balances = useSelector(selectPortfolioCryptoHumanBalanceBySymbol)
  const getCoinifySupportedCurrencies: () => Promise<SupportedCurrency[]> = async () => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_COINIFY_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
    }
  }

  const getWyreSupportedCurrencies: () => Promise<SupportedCurrency[]> = async () => {
    try {
      const { data } = await axios.get(getConfig().REACT_APP_GEM_WYRE_SUPPORTED_COINS)
      return data
    } catch (e: any) {
      console.error(e)
    }
  }

  const buyFilter = (currency: SupportedCurrency) =>
    currency.transaction_direction === TransactionDirection.BankToBlockchain ||
    currency.transaction_direction === TransactionDirection.CardToBlockchain

  const sellFilter = (currency: SupportedCurrency) =>
    currency.transaction_direction === TransactionDirection.BlockchainToBank

  const filterAndMerge = useMemo(
    () =>
      (
        coinifyList: SupportedCurrency[],
        wyreList: SupportedCurrency[],
        key: 'destination' | 'source',
        filter: (currency: SupportedCurrency) => boolean
      ): CurrencyAsset[] => {
        const list1 = coinifyList.filter(filter).map(list => list[key].currencies)
        const list2 = wyreList.filter(filter).map(list => list[key].currencies)
        const results = uniqBy(flatten(concat(list1, list2)), 'gem_asset_id')
          .map(result => ({ ...result, balance: Number(balances[result.ticker]) || 0 }))
          .sort((a, b) => b.balance - a.balance)
        return results
      },
    [balances]
  )

  const fetchSupportedCurrencies = async () => {
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
    fetchSupportedCurrencies()
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
            type={type}
            assets={searching ? filteredAssets : currentAssets}
            handleClick={onClick}
          />
        )}
      </Box>
    </>
  )
}
