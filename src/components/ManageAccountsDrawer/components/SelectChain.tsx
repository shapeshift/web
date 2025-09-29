import { Button, SimpleGrid, Stack, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { filterChainIdsBySearchTerm } from '../helpers'
import { DrawerContentWrapper } from './DrawerContent'
import { DrawerWrapper } from './DrawerWrapper'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { GlobalFilter } from '@/components/StakingVaults/GlobalFilter'
import { RawText } from '@/components/Text'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { availableLedgerChainIds } from '@/context/WalletProvider/Ledger/constants'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetChainAdapter, chainIdToFeeAssetId } from '@/lib/utils'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectAssetById, selectWalletConnectedChainIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const inputGroupProps = { size: 'lg' }

export type SelectChainProps = {
  onSelectChainId: (chainId: ChainId) => void
  onClose: () => void
  isOpen: boolean
}

const buttonsStackColumns = {
  base: 2,
  md: 3,
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
  const handleClick = useCallback(() => {
    onClick(chainId)
  }, [chainId, onClick])

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

export const SelectChain = ({ onSelectChainId, onClose, isOpen }: SelectChainProps) => {
  const translate = useTranslate()
  const [searchTermChainIds, setSearchTermChainIds] = useState<ChainId[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const { state } = useWallet()
  const { connectedType } = state

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const walletSupportedChainIds = useAppSelector(portfolio.selectors.selectWalletSupportedChainIds)

  const availableChainIds = useMemo(() => {
    const allAvailableChainIds =
      connectedType === KeyManager.Ledger ? availableLedgerChainIds : walletSupportedChainIds

    return allAvailableChainIds.filter(chainId => !walletConnectedChainIds.includes(chainId))
  }, [connectedType, walletConnectedChainIds, walletSupportedChainIds])

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
        <SimpleGrid columns={buttonsStackColumns} spacing={4}>
          {chainButtons}
        </SimpleGrid>
      </Stack>
    )
  }, [chainButtons, searchQuery, translate])

  return (
    <DrawerWrapper isOpen={isOpen} onClose={onClose}>
      <DrawerContentWrapper
        title={translate('accountManagement.selectChain.title')}
        description={translate('accountManagement.selectChain.description')}
        footer={footer}
        body={body}
      />
    </DrawerWrapper>
  )
}
