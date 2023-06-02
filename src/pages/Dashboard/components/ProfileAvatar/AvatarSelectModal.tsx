import type { ModalProps } from '@chakra-ui/react'
import {
  Button,
  Center,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  useRadioGroup,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'
import { nft, useGetNftUserTokensQuery } from 'state/apis/nft/nftApi'
import {
  makeSelectNftItemsWithCollectionSelector,
  selectSelectedNftAvatar,
} from 'state/apis/nft/selectors'
import type { NftItemWithCollection } from 'state/apis/nft/types'
import { selectWalletAccountIds, selectWalletId } from 'state/slices/common-selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AvatarRadio } from './AvatarRadio'

type AvatarSelectModalProps = Pick<ModalProps, 'isOpen'> &
  Pick<ModalProps, 'onClose'> & { walletImage: string }

export const AvatarSelectModal: React.FC<AvatarSelectModalProps> = props => {
  const [selected, setSelected] = useState<AssetId | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const walletId = useAppSelector(selectWalletId)
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const accountIds = useAppSelector(selectWalletAccountIds)
  const selectedNftAvatar = useAppSelector(selectSelectedNftAvatar)

  const { isLoading } = useGetNftUserTokensQuery({ accountIds })
  const selectNftItemsWithCollectionSelector = useMemo(
    () => makeSelectNftItemsWithCollectionSelector(accountIds),
    [accountIds],
  )
  const nftItems = useAppSelector(selectNftItemsWithCollectionSelector)

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

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'framework',
    onChange: setSelected,
    defaultValue,
  })

  const group = getRootProps()

  const renderItems = useMemo(() => {
    return filteredNfts?.map(({ assetId, medias }) => {
      if (!assetId) return null
      const mediaUrl = medias?.[0]?.originalUrl
      return <AvatarRadio key={assetId} src={mediaUrl} {...getRadioProps({ value: assetId })} />
    })
  }, [filteredNfts, getRadioProps])

  const handleSaveChanges = useCallback(() => {
    if (selected && walletId) {
      dispatch(nft.actions.setWalletSelectedNftAvatar({ nftAssetId: selected, walletId }))
    }
    props.onClose()
  }, [dispatch, props, selected, walletId])

  return (
    <Modal size='lg' {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{translate('avatar.modal.title')}</ModalHeader>
        {isLoading ? (
          <ModalBody>
            <Center py={12}>
              <CircularProgress />
            </Center>
          </ModalBody>
        ) : (
          <>
            <ModalBody pb={4} display='flex' flexDir='column' gap={4}>
              <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
              <SimpleGrid
                gridGap={4}
                gridTemplateColumns={{ base: '1fr 1fr', md: '1fr 1fr 1fr' }}
                {...group}
              >
                <AvatarRadio
                  key={defaultWalletImage}
                  src={defaultWalletImage}
                  {...getRadioProps({ value: defaultWalletImage })}
                />
                {renderItems}
              </SimpleGrid>
            </ModalBody>
            <ModalFooter>
              <Button onClick={props.onClose}>{translate('common.cancel')}</Button>
              <Button ml={4} colorScheme='blue' onClick={handleSaveChanges}>
                {translate('common.saveChanges')}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
