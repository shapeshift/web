import type { StackProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  HStack,
  List,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { useMemo, useState } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { chainIdToChainDisplayName } from 'lib/utils'
import { AccountEntryRow } from 'pages/Accounts/components/AccountEntryRow'
import { getFeeAssetByAssetId } from 'state/slices/assetsSlice/utils'
import { selectRelatedAssetIds } from 'state/slices/related-assets-selectors'
import { selectAccountIdsByChainId, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

type Filter = {
  label: string
  chainId?: string
  assetId?: AssetId
}

const buttonsHover = {
  opacity: '.6',
}
const hstackProps: StackProps = {
  flexWrap: {
    base: 'wrap',
    md: 'nowrap',
  },
}

const ALL_FILTER_KEY = 'All'

export const FoxTokenBalances = () => {
  const buttonsBgColor = useColorModeValue('grey.500', 'white')
  const assets = useAppSelector(selectAssets)
  const { assetId, selectedAssetAccountId, assetAccountNumber } = useFoxPageContext()
  const [selectedFilters, setSelectedFilters] = useState([ALL_FILTER_KEY])

  const relatedAssetIdsFilter = useMemo(() => ({ assetId, onlyConnectedChains: true }), [assetId])
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIds(state, relatedAssetIdsFilter),
  )

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

  const assetsWithFoxOnEthereum = useMemo(() => {
    return [foxAssetId, ...relatedAssetIds]
  }, [relatedAssetIds])

  const filteredAssets = useMemo(() => {
    if (selectedFilters.includes(ALL_FILTER_KEY)) return assetsWithFoxOnEthereum

    return assetsWithFoxOnEthereum.filter(assetId => {
      const chainId = fromAssetId(assetId).chainId
      return selectedFilters.includes(chainId)
    })
  }, [selectedFilters, assetsWithFoxOnEthereum])

  const filters = useMemo<Filter[]>(() => {
    return [
      {
        label: ALL_FILTER_KEY,
      },
      ...assetsWithFoxOnEthereum.map(assetId => ({
        label: chainIdToChainDisplayName(fromAssetId(assetId).chainId),
        chainId: fromAssetId(assetId).chainId,
        assetId,
      })),
    ]
  }, [assetsWithFoxOnEthereum])

  const handleFilterClick = (filter: Filter) => {
    setSelectedFilters(prev => {
      if (filter.label === ALL_FILTER_KEY) {
        return [ALL_FILTER_KEY]
      }

      if (!filter.chainId) return prev

      const newFilters = prev.filter(f => f !== ALL_FILTER_KEY && f !== filter.label)

      if (!prev.includes(filter.chainId)) {
        newFilters.push(filter.chainId)
      } else {
        newFilters.splice(newFilters.indexOf(filter.chainId), 1)
      }

      return newFilters.length ? newFilters : [ALL_FILTER_KEY]
    })
  }

  return (
    <Box>
      <ButtonGroup variant='transparent' spacing={0} mb={4}>
        <HStack spacing={1} p={1} borderRadius='md' {...hstackProps}>
          {filters.map(filter => {
            const feeAsset = getFeeAssetByAssetId(assets, filter.assetId)

            const iconSrc = feeAsset?.networkIcon

            const networkIcon = iconSrc ? (
              <AssetIcon src={iconSrc} size='xs' />
            ) : (
              <AssetIcon assetId={feeAsset?.assetId ?? ''} size='xs' />
            )

            const isFilterSelected = selectedFilters.includes(filter.chainId ?? ALL_FILTER_KEY)

            return (
              <Button
                key={filter.label}
                size='sm'
                colorScheme='gray'
                borderRadius='full'
                _hover={buttonsHover}
                variant={isFilterSelected ? 'solid' : 'outline'}
                backgroundColor={isFilterSelected ? buttonsBgColor : 'transparent'}
                color={isFilterSelected ? 'gray.900' : 'white'}
                // eslint-disable-next-line react-memo/require-usememo
                onClick={() => handleFilterClick(filter)}
                leftIcon={filter.assetId ? networkIcon : undefined}
              >
                {filter.label}
              </Button>
            )
          })}
        </HStack>
      </ButtonGroup>
      <Card>
        <CardBody>
          <List>
            {filteredAssets.map(filteredAssetId => {
              if (!selectedAssetAccountId) return null
              const filteredAssetChainId = fromAssetId(filteredAssetId).chainId

              if (!filteredAssetChainId) return null
              const filteredAssetAccountId = accountIdsByChainId[filteredAssetChainId]

              if (!filteredAssetAccountId) return null
              if (assetAccountNumber === undefined) return null

              return (
                <AccountEntryRow
                  key={filteredAssetId}
                  accountId={filteredAssetAccountId[assetAccountNumber]}
                  assetId={filteredAssetId}
                  showNetworkIcon={true}
                />
              )
            })}
          </List>
        </CardBody>
      </Card>
    </Box>
  )
}
