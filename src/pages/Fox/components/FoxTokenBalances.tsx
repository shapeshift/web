import type { StackProps } from '@chakra-ui/react'
import { Box, ButtonGroup, Card, CardBody, HStack, List } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { JSX } from 'react'
import { useMemo, useState } from 'react'

import { useFoxPageContext } from '../hooks/useFoxPageContext'
import type { Filter } from './FoxTokenFilterButton'
import { FoxTokenFilterButton } from './FoxTokenFilterButton'

import { Text } from '@/components/Text'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { chainIdToChainDisplayName } from '@/lib/utils'
import { AccountEntryRow } from '@/pages/Accounts/components/AccountEntryRow'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectRelatedAssetIds } from '@/state/slices/related-assets-selectors'
import { selectAccountIdsByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const hstackProps: StackProps = {
  flexWrap: {
    base: 'wrap',
    md: 'nowrap',
  },
}

const accountRowButtonProps = {
  justifyContent: 'space-between',
  sx: {
    '.account-entry-row__amounts': {
      pl: 2,
    },
  },
} as const

const ALL_FILTER_KEY = 'All'

export const FoxTokenBalances = () => {
  const {
    state: { isConnected: isWalletConnected },
  } = useWallet()
  const walletType = useAppSelector(selectWalletType)
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger
  const isConnected = isWalletConnected || isLedgerReadOnly

  const { assetId, assetAccountId, assetAccountNumber } = useFoxPageContext()
  const [selectedFilters, setSelectedFilters] = useState([ALL_FILTER_KEY])

  const relatedAssetIdsFilter = useMemo(() => ({ assetId, onlyConnectedChains: true }), [assetId])
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIds(state, relatedAssetIdsFilter),
  )

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

  const assetsWithFoxOnEthereum = useMemo(() => {
    return [assetId, ...relatedAssetIds]
  }, [relatedAssetIds, assetId])

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

  const filteredAssetsAccountEntryRows = useMemo(() => {
    if (!isConnected) {
      return <Text translation='common.noAccounts' color='text.subtle' />
    }

    const entries = filteredAssets.reduce<JSX.Element[]>((acc, filteredAssetId) => {
      if (!assetAccountId) return acc
      const filteredAssetChainId = fromAssetId(filteredAssetId).chainId

      if (!filteredAssetChainId) return acc
      const filteredAssetAccountIds = accountIdsByChainId[filteredAssetChainId]

      if (assetAccountNumber === undefined) return acc
      if (!filteredAssetAccountIds?.[assetAccountNumber]) return acc

      acc.push(
        <AccountEntryRow
          key={filteredAssetId}
          accountId={filteredAssetAccountIds[assetAccountNumber]}
          assetId={filteredAssetId}
          showNetworkIcon={true}
          maximumFractionDigits={2}
          {...accountRowButtonProps}
        />,
      )

      return acc
    }, [])

    if (!entries.length) {
      return <Text translation='common.noAccounts' color='text.subtle' />
    }

    return entries
  }, [isConnected, accountIdsByChainId, assetAccountNumber, filteredAssets, assetAccountId])

  return (
    <Box mb={10}>
      <ButtonGroup variant='transparent' mb={4} spacing={0}>
        <HStack spacing={1} p={1} borderRadius='md' {...hstackProps}>
          {filters.map(filter => (
            <FoxTokenFilterButton
              key={filter.label}
              onFilterClick={handleFilterClick}
              filter={filter}
              isSelected={selectedFilters.includes(filter.chainId ?? ALL_FILTER_KEY)}
            />
          ))}
        </HStack>
      </ButtonGroup>
      <Card>
        <CardBody>
          <List>{filteredAssetsAccountEntryRows}</List>
        </CardBody>
      </Card>
    </Box>
  )
}
