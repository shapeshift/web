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
import { useFetchNfts } from 'components/Nfts/hooks/useFetchNfts'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import { RawText } from 'components/Text'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'
import { nft } from 'state/apis/nft/nftApi'
import {
  selectPortfolioNftItemsWithCollectionExcludeSpams,
  selectSelectedNftAvatar,
} from 'state/apis/nft/selectors'
import type { NftItemWithCollection } from 'state/apis/nft/types'
import { selectWalletId } from 'state/slices/common-selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { NftRow } from './NftRow'

type AvatarSelectModalProps = Pick<ModalProps, 'isOpen'> &
  Pick<ModalProps, 'onClose'> & { walletImage: string }

const narwhalIcon = <NarwhalIcon color='pink.200' />
const modalSizeProp = { base: 'full', md: 'lg' }
const boxMinHeightProp = { base: '100%', md: '500px' }
const buttonWidthProp = { base: 'full', md: 'auto' }

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = props => {
  const [selected, setSelected] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const walletId = useAppSelector(selectWalletId)
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const selectedNftAvatar = useAppSelector(selectSelectedNftAvatar)
  const columnCount = useBreakpointValue({ base: 2, md: 3 }, { ssr: false }) ?? 2

  const { isLoading } = useFetchNfts()
  const nftItems = useAppSelector(selectPortfolioNftItemsWithCollectionExcludeSpams)

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
      return matchSorter(data, search, { keys, threshold: matchSorter.rankings.CONTAINS })
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

  const handleChangeAvatar = useCallback(
    (selectedAvatar: string | null) => {
      if (selectedAvatar && walletId) {
        dispatch(nft.actions.setWalletSelectedNftAvatar({ nftAssetId: selectedAvatar, walletId }))
      }
      props.onClose()
    },
    [dispatch, props, walletId],
  )

  const handleSaveChanges = useCallback(() => {
    if (selected && walletId) {
      dispatch(nft.actions.setWalletSelectedNftAvatar({ nftAssetId: selected, walletId }))
    }
    props.onClose()
  }, [dispatch, props, walletId, selected])

  const handleRestoreDefault = useCallback(() => {
    setValue('')
    handleChangeAvatar(defaultWalletImage)
  }, [defaultWalletImage, handleChangeAvatar, setValue])

  const gridItemData = useMemo(
    () => ({ filteredNfts, columnCount, getRadioProps }),
    [columnCount, filteredNfts, getRadioProps],
  )

  const renderBody = useMemo(() => {
    if (!isLoading && !nftItems?.length) {
      return <ResultsEmpty title='nft.emptyTitle' body='nft.emptyBody' icon={narwhalIcon} />
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
              itemData={gridItemData}
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
    filteredNfts.length,
    gridItemData,
    isLoading,
    isSearching,
    nftItems?.length,
    searchQuery,
  ])

  return (
    <Modal scrollBehavior='inside' size={modalSizeProp} {...props}>
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
              <Box flex={1} minHeight={boxMinHeightProp} {...group}>
                {renderBody}
              </Box>
            </ModalBody>
            <ModalFooter gap={4}>
              <Button
                width={buttonWidthProp}
                height='100%'
                size='sm-multiline'
                onClick={handleRestoreDefault}
                mr='auto'
              >
                {translate('avatar.modal.restoreDefault')}
              </Button>
              <Button
                width={buttonWidthProp}
                height='100%'
                colorScheme='blue'
                size='sm-multiline'
                onClick={handleSaveChanges}
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
