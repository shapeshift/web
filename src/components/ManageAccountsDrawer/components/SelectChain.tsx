import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { assertGetChainAdapter, chainIdToFeeAssetId } from 'lib/utils'
import { selectAssetById, selectWalletSupportedChainIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { filterChainIdsBySearchTerm } from '../helpers'
import { DrawerContentWrapper } from './DrawerContent'

export type SelectChainProps = {
  onSelectChainId: (chainId: ChainId) => void
  onClose: () => void
}

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const ChainButton = ({
  chainId,
  isActive,
  onClick,
}: {
  chainId: ChainId
  isActive: boolean
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
    <Button height='100px' width='full' onClick={handleClick} isActive={isActive}>
      <VStack direction='column'>
        <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='sm' />
        <RawText>{chainAdapter.getDisplayName()}</RawText>
      </VStack>
    </Button>
  )
}

export const SelectChain = ({ onSelectChainId, onClose }: SelectChainProps) => {
  const translate = useTranslate()
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)
  const [searchTermChainIds, setSearchTermChainIds] = useState<ChainId[]>([])

  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })
  const searchString = watch('search')

  const searching = useMemo(() => searchString.length > 0, [searchString])

  useEffect(() => {
    if (!searching) return

    setSearchTermChainIds(filterChainIdsBySearchTerm(searchString, walletSupportedChainIds))
  }, [searchString, searching, walletSupportedChainIds])

  const handleClickDone = useCallback(() => {
    // This should never happen, but just in case.
    if (!selectedChainId) return

    onSelectChainId(selectedChainId)
  }, [onSelectChainId, selectedChainId])

  const chainButtons = useMemo(() => {
    const listChainIds = searching ? searchTermChainIds : walletSupportedChainIds
    return listChainIds.map(chainId => {
      return (
        <ChainButton
          key={chainId}
          chainId={chainId}
          isActive={Boolean(selectedChainId) && selectedChainId === chainId}
          onClick={setSelectedChainId}
        />
      )
    })
  }, [searchTermChainIds, searching, selectedChainId, walletSupportedChainIds])

  const footer = useMemo(() => {
    return (
      <>
        <Button colorScheme='gray' mr={3} onClick={onClose}>
          {translate('common.cancel')}
        </Button>
        <Button
          colorScheme='blue'
          onClick={handleClickDone}
          isDisabled={selectedChainId === null}
          _disabled={disabledProp}
        >
          {translate('common.next')}
        </Button>
      </>
    )
  }, [handleClickDone, onClose, selectedChainId, translate])

  const body = useMemo(() => {
    return (
      <>
        <Box as='form' mb={3} px={4} visibility='visible' onSubmit={handleSubmit}>
          <InputGroup size='lg'>
            {/* Override zIndex to prevent element displaying on overlay components */}
            <InputLeftElement pointerEvents='none' zIndex={1}>
              <SearchIcon color='gray.300' />
            </InputLeftElement>
            <Input
              {...register('search')}
              type={'text'}
              placeholder={translate('accountManagement.selectChain.searchChains')}
              pl={10}
              variant={'filled'}
              autoComplete={'off'}
              autoFocus={false}
              transitionProperty={'none'}
            />
          </InputGroup>
        </Box>
        <SimpleGrid columns={3} spacing={6}>
          {chainButtons}
        </SimpleGrid>
      </>
    )
  }, [chainButtons, handleSubmit, register, translate])

  return (
    <DrawerContentWrapper
      title={translate('accountManagement.selectChain.title')}
      description={translate('accountManagement.selectChain.description')}
      footer={footer}
      body={body}
    />
  )
}
