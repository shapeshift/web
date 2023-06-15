import type { ModalProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Center,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useBreakpointValue,
  useRadioGroup,
} from '@chakra-ui/react'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeGrid } from 'react-window'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { NarwhalIcon } from 'components/Icons/Narwhal'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import { RawText } from 'components/Text'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'
import { nft } from 'state/apis/nft/nftApi'
import {
  selectGetNftUserTokensPending,
  selectPortfolioNftItemsWithCollection,
  selectSelectedNftAvatar,
} from 'state/apis/nft/selectors'
import type { NftItemWithCollection } from 'state/apis/nft/types'
import { selectWalletId } from 'state/slices/common-selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { NftRow } from './NftRow'

type AvatarSelectModalProps = Pick<ModalProps, 'isOpen'> &
  Pick<ModalProps, 'onClose'> & { walletImage: string }

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = props => {
  const [selected, setSelected] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const walletId = useAppSelector(selectWalletId)
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const selectedNftAvatar = useAppSelector(selectSelectedNftAvatar)
  const columnCount = useBreakpointValue({ base: 2, md: 3 }, { ssr: false }) ?? 2

  const isLoading = useAppSelector(selectGetNftUserTokensPending)
  const nftItems = useAppSelector(selectPortfolioNftItemsWithCollection)

  const defaultWalletImage = useMemo(
    () => makeBlockiesUrl(`${walletId}ifyoudriveatruckdriveitlikeyouhaveafarm`),
    [walletId],
  )
  const filteredData = useMemo(
    () => nftItems.filter(item => item.medias[0]?.type === 'image'),
    [nftItems],
  )
  const filterNftsBySearchTerm = useCallback(
    (data: NftItemWithCollection[], searchQuery: string) => {
      const search = searchQuery.trim().toLowerCase()
      const keys = ['name', 'collection.name', 'collection.assetId', 'assetId', 'id']
      return matchSorter(data, search, { keys })
    },
    [],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const filteredNfts = useMemo(() => {
    return isSearching && filteredData
      ? filterNftsBySearchTerm(filteredData, searchQuery)
      : filteredData
  }, [isSearching, filteredData, filterNftsBySearchTerm, searchQuery])

  const defaultValue = selectedNftAvatar ?? defaultWalletImage

  const { getRootProps, getRadioProps, setValue } = useRadioGroup({
    name: 'framework',
    onChange: setSelected,
    defaultValue,
  })

  const group = getRootProps()

  const handleSaveChanges = useCallback(
    (selectedAvatar: string | null) => {
      if (selectedAvatar && walletId) {
        dispatch(nft.actions.setWalletSelectedNftAvatar({ nftAssetId: selectedAvatar, walletId }))
      }
      props.onClose()
    },
    [dispatch, props, walletId],
  )

  const handleRestoreDefault = useCallback(() => {
    setValue('')
    handleSaveChanges(defaultWalletImage)
  }, [defaultWalletImage, handleSaveChanges, setValue])

  const renderBody = useMemo(() => {
    if (!isLoading && !nftItems?.length) {
      return (
        <ResultsEmpty
          title='nft.emptyTitle'
          body='nft.emptyBody'
          icon={<NarwhalIcon color='pink.200' />}
        />
      )
    }
    return isSearching && !filteredNfts?.length ? (
      <SearchEmpty searchQuery={searchQuery} />
    ) : (
      <AutoSizer>
        {({ width, height }) => {
          return (
            <FixedSizeGrid
              width={width}
              height={height}
              itemData={{ filteredNfts, columnCount, getRadioProps }}
              columnWidth={width / columnCount}
              rowCount={filteredNfts.length / columnCount}
              rowHeight={width / columnCount}
              columnCount={columnCount}
              overscanRowCount={15}
            >
              {NftRow}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    )
  }, [
    columnCount,
    filteredNfts,
    getRadioProps,
    isLoading,
    isSearching,
    nftItems?.length,
    searchQuery,
  ])

  return (
    <Modal scrollBehavior='inside' size={{ base: 'full', md: 'lg' }} {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <RawText mb={2}>{translate('avatar.modal.title')}</RawText>
          <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
          <ModalCloseButton />
        </ModalHeader>
        {isLoading ? (
          <ModalBody>
            <Center py={12}>
              <CircularProgress />
            </Center>
          </ModalBody>
        ) : (
          <>
            <ModalBody pb={4} display='flex' flexDir='column' gap={4} overflow='hidden'>
              <Box flex={1} minHeight={{ base: '100%', md: '500px' }} {...group}>
                {renderBody}
              </Box>
            </ModalBody>
            <ModalFooter gap={4}>
              <Button
                width={{ base: 'full', md: 'auto' }}
                height='100%'
                size='sm-multiline'
                onClick={handleRestoreDefault}
                mr='auto'
              >
                {translate('avatar.modal.restoreDefault')}
              </Button>
              <Button
                width={{ base: 'full', md: 'auto' }}
                height='100%'
                colorScheme='blue'
                size='sm-multiline'
                onClick={() => handleSaveChanges(selected)}
              >
                {translate('common.saveChanges')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
