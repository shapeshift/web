import { Button, SimpleGrid, Stack, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { RawText } from 'components/Text'
import { availableLedgerChainIds } from 'context/WalletProvider/Ledger/constants'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertGetChainAdapter, chainIdToFeeAssetId } from 'lib/utils'
import {
  selectAssetById,
  selectWalletChainIds,
  selectWalletSupportedChainIds,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { filterChainIdsBySearchTerm } from '../helpers'
import { DrawerContentWrapper } from './DrawerContent'

const inputGroupProps = { size: 'lg' }

export type SelectChainProps = {
  onSelectChainId: (chainId: ChainId) => void
  onClose: () => void
}

const ChainButton = ({
  chainId,
  onClick,
}: {
  chainId: ChainId
  onClick: (chainId: ChainId) => void
}) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const handleClick = useCallback(() => onClick(chainId), [chainId, onClick])

  const chainAdapter = useMemo(() => {
    return assertGetChainAdapter(chainId)
  }, [chainId])

  if (!feeAsset) return null

  return (
    <Button height='100px' width='full' onClick={handleClick}>
      <VStack direction='column'>
        <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='sm' />
        <RawText>{chainAdapter.getDisplayName()}</RawText>
      </VStack>
    </Button>
  )
}

export const SelectChain = ({ onSelectChainId, onClose }: SelectChainProps) => {
  const translate = useTranslate()
  const [searchTermChainIds, setSearchTermChainIds] = useState<ChainId[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const wallet = useWallet().state.wallet

  const walletConnectedChainIds = useAppSelector(selectWalletChainIds)
  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

  const availableChainIds = useMemo(() => {
    // If a Ledger is connected, we have the option to add additional chains that are not currently "supported" by the HDWallet
    const allAvailableChainIds =
      wallet && isLedger(wallet) ? availableLedgerChainIds : walletSupportedChainIds

    return allAvailableChainIds.filter(chainId => !walletConnectedChainIds.includes(chainId))
  }, [wallet, walletConnectedChainIds, walletSupportedChainIds])

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  useEffect(() => {
    if (!isSearching) return

    setSearchTermChainIds(filterChainIdsBySearchTerm(searchQuery, availableChainIds))
  }, [searchQuery, isSearching, availableChainIds])

  const chainButtons = useMemo(() => {
    const listChainIds = isSearching ? searchTermChainIds : availableChainIds
    return listChainIds.map(chainId => {
      return <ChainButton key={chainId} chainId={chainId} onClick={onSelectChainId} />
    })
  }, [onSelectChainId, searchTermChainIds, isSearching, availableChainIds])

  const footer = useMemo(() => {
    return (
      <>
        <Button colorScheme='gray' mr={3} onClick={onClose}>
          {translate('common.cancel')}
        </Button>
      </>
    )
  }, [onClose, translate])

  const body = useMemo(() => {
    return (
      <Stack spacing={4}>
        <GlobalFilter
          setSearchQuery={setSearchQuery}
          searchQuery={searchQuery}
          placeholder={translate('accountManagement.selectChain.searchChains')}
          inputGroupProps={inputGroupProps}
        />
        <SimpleGrid columns={3} spacing={4}>
          {chainButtons}
        </SimpleGrid>
      </Stack>
    )
  }, [chainButtons, searchQuery, translate])

  return (
    <DrawerContentWrapper
      title={translate('accountManagement.selectChain.title')}
      description={translate('accountManagement.selectChain.description')}
      footer={footer}
      body={body}
    />
  )
}
