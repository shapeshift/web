import type { TabProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Flex,
  Image,
  Link,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TagLeftIcon,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import Placeholder from 'assets/placeholder.png'
import PlaceholderDrk from 'assets/placeholder-drk.png'
import { ArrowRightUp } from 'components/Icons/ArrowRightUp'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { ordinalSuffix } from 'context/WalletProvider/NativeWallet/components/NativeTestPhrase'
import { useModal } from 'hooks/useModal/useModal'
import { useGetNftCollectionQuery } from 'state/apis/nft/nftApi'
import type { NftItem } from 'state/apis/nft/types'
import { chainIdToOpenseaNetwork } from 'state/apis/nft/utils'
import { getMediaType } from 'state/apis/zapper/validators'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { NftCollection } from './components/NftCollection'
import { NftOverview } from './components/NftOverview'
const NftTab: React.FC<TabProps> = props => {
  const activeTabColor = useColorModeValue('blue.500', 'white')
  return (
    <Tab
      color='gray.500'
      fontWeight='medium'
      px={0}
      _selected={{ color: activeTabColor }}
      {...props}
    />
  )
}

export type NftModalProps = {
  nftItem: NftItem
}

export const NftModal: React.FC<NftModalProps> = ({ nftItem }) => {
  const dispatch = useAppDispatch()
  const { nft } = useModal()
  const { close: handleClose, isOpen } = nft
  const translate = useTranslate()
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const modalBg = useColorModeValue('white', 'gray.800')
  const modalHeaderBg = useColorModeValue('gray.50', 'gray.785')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const accountIds = useAppSelector(selectWalletAccountIds)

  const { data: nftCollection } = useGetNftCollectionQuery(
    { accountIds, collectionId: nftItem.collection.id ?? '' },
    { skip: !nftItem.collection.id },
  )

  const mediaUrl = nftItem.medias[0]?.originalUrl
  const mediaType = getMediaType(mediaUrl)
  const placeholderImage = useColorModeValue(PlaceholderDrk, Placeholder)

  const name = nftItem.name
  const nftId = nftItem.id
  const collectionName = nftItem.collection.name
  const rarityRank = nftItem.rarityRank
  const floorPrice = nftItem.collection.floorPrice
  const price = nftItem.price
  const openseaId = nftItem.collection.openseaId
  const chainId = nftItem.collection.chainId
  const maybeChainAdapter = getChainAdapterManager().get(chainId as ChainId)
  const maybeFeeAssetId = maybeChainAdapter?.getFeeAssetId()
  const maybeFeeAsset = useAppSelector(state => selectAssetById(state, maybeFeeAssetId ?? ''))
  const collectionOpenseaNetwork = chainIdToOpenseaNetwork(chainId as ChainId)
  const collectionAddress =
    nftItem.collection.id && fromAssetId(nftItem.collection.id).assetReference
  const collectionLink = openseaId ? `https://opensea.io/collection/${openseaId}` : null
  const rarityDisplay = rarityRank ? `${rarityRank}${ordinalSuffix(rarityRank)}` : null
  const assetLink =
    collectionOpenseaNetwork && collectionAddress && nftId
      ? `https://opensea.io/assets/${collectionOpenseaNetwork}/${collectionAddress}/${nftId}`
      : null

  const mediaBoxProps = useMemo(
    () =>
      ({
        width: 'full',
        height: 'auto',
        objectFit: 'contain',
        boxShadow: 'dark-lg',
        borderRadius: 'xl',
        mb: { base: -14, md: 0 },
      } as const),
    [],
  )

  const handleSetAsAvatarClick = useCallback(() => {
    // Unable to get the AssetId of the collection, this should never happen but it may
    // TODO(gomes): remove nftAssetId manual serialization when we have a normalized nft slice with nft id as AssetId
    //
    if (!nftCollection?.id) return null

    const { setSelectedNftAvatar } = preferences.actions
    const nftAssetId = `${nftCollection.id}/${nftId}`
    dispatch(setSelectedNftAvatar(nftAssetId))
  }, [dispatch, nftCollection?.id, nftId])

  const nftModalMedia = useMemo(() => {
    return (
      <Skeleton flex={1} isLoaded={isMediaLoaded}>
        <Flex
          flex={1}
          height='full'
          backgroundImage={mediaUrl}
          backgroundSize='cover'
          backgroundPosition='center center'
        >
          <Flex
            direction='row'
            alignItems='center'
            p={{ base: 8, md: 20 }}
            justifyContent={{ base: 'flex-start', md: 'center' }}
            bg='blackAlpha.500'
            transition='all 1s ease-in-out'
            backdropFilter='auto'
            backdropBlur='3xl'
            transform='translate3d(0, 0, 0)'
            width='full'
            flexDir='column'
            gap={4}
          >
            <Flex position={{ base: 'static', md: 'absolute' }} right='1em' top='1em'>
              {assetLink && (
                <Button
                  as={Link}
                  isExternal
                  href={assetLink}
                  size='sm'
                  colorScheme='whiteAlpha'
                  rightIcon={<ArrowRightUp />}
                >
                  OpenSea
                </Button>
              )}
            </Flex>
            {!mediaUrl || mediaType === 'image' ? (
              <>
                <Image
                  src={mediaUrl ?? placeholderImage}
                  onLoad={() => setIsMediaLoaded(true)}
                  {...mediaBoxProps}
                />
                <Button colorScheme='whiteAlpha' onClick={handleSetAsAvatarClick}>
                  {translate('nft.setAsAvatar')}
                </Button>
              </>
            ) : (
              <Box
                as='video'
                src={mediaUrl}
                onCanPlayThrough={() => setIsMediaLoaded(true)}
                loop
                // Needed because of chrome autoplay policy: https://developer.chrome.com/blog/autoplay/#new-behaviors
                muted
                autoPlay
                {...mediaBoxProps}
              />
            )}
          </Flex>
        </Flex>
      </Skeleton>
    )
  }, [
    assetLink,
    handleSetAsAvatarClick,
    isMediaLoaded,
    mediaBoxProps,
    mediaType,
    mediaUrl,
    placeholderImage,
    translate,
  ])

  const nftModalOverview = useMemo(() => {
    return (
      <Flex flexDir='column' px={8} pb={6} pt={12} bg={modalHeaderBg} gap={4}>
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex flexDir='column'>
            {collectionLink && (
              <Button
                as='a'
                href={collectionLink}
                target='_blank'
                rel='noopener noreferrer'
                justifyContent='flex-start'
                variant='link'
                color='blue.200'
                fontSize='xs'
                rightIcon={<ArrowRightUp />}
              >
                {collectionName}
              </Button>
            )}
            <RawText fontSize='lg' fontWeight='bold'>
              {name}
            </RawText>
          </Flex>
          {rarityDisplay && (
            <Tag colorScheme='purple' variant='solid'>
              <TagLeftIcon as={DiamondIcon} />
              {rarityDisplay}
            </Tag>
          )}
        </Flex>
        <StatGroup>
          {floorPrice && maybeFeeAsset && (
            <Stat>
              <StatLabel>{translate('nft.floorPrice')}</StatLabel>
              <StatNumber>
                {floorPrice} {maybeFeeAsset.symbol}
              </StatNumber>
            </Stat>
          )}
          {price && maybeFeeAsset && (
            <Stat>
              <StatLabel>{translate('nft.lastPrice')}</StatLabel>
              <StatNumber>
                {price} {maybeFeeAsset.symbol}
              </StatNumber>
            </Stat>
          )}
        </StatGroup>
      </Flex>
    )
  }, [
    modalHeaderBg,
    collectionLink,
    collectionName,
    name,
    rarityDisplay,
    floorPrice,
    maybeFeeAsset,
    translate,
    price,
  ])

  const nftModalDetails = useMemo(() => {
    if (!(nftCollection || nftItem.collection)) return null

    const hasUsefulCollectionData = Boolean(
      nftItem.collection.description ||
        nftCollection?.description ||
        nftItem.collection.socialLinks?.length ||
        nftCollection?.socialLinks?.length,
    )
    return (
      <Tabs display='flex' flexDir='column' position='relative' variant='unstyled' flex={1}>
        <Box position='relative'>
          <TabList gap={4} px={8} bg={modalHeaderBg}>
            <NftTab>{translate('nft.overview')}</NftTab>
            {/* <NftTab>{translate('nft.properties')}</NftTab> */}
            {hasUsefulCollectionData && <NftTab>{translate('nft.collection')}</NftTab>}
          </TabList>
          <TabIndicator mt='-1.5px' height='2px' bg='blue.200' borderRadius='1px' />
        </Box>
        <TabPanels maxHeight={{ base: 'auto', md: '500px' }} overflowY='auto' flex={1}>
          <TabPanel p={0}>
            <NftOverview nftItem={nftItem} nftCollection={nftCollection} />
          </TabPanel>
          {hasUsefulCollectionData && (
            <TabPanel p={0}>
              <NftCollection
                name={nftCollection?.name || nftItem.collection.name}
                description={nftCollection?.description || nftItem.collection.description}
                socialLinks={
                  nftCollection?.socialLinks.length
                    ? nftCollection?.socialLinks
                    : nftItem.collection.socialLinks
                }
              />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    )
  }, [modalHeaderBg, translate, nftCollection, nftItem])

  const nftModalContent = useMemo(() => {
    return (
      <Flex flexDir='column' flex={1}>
        {nftModalOverview}
        {nftModalDetails}
      </Flex>
    )
  }, [nftModalOverview, nftModalDetails])

  if (!(nftCollection || nftItem.collection)) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered={isLargerThanMd}>
      <ModalOverlay />
      <ModalContent
        maxWidth='container.lg'
        overflow='hidden'
        bg={modalBg}
        borderWidth={0}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <ModalCloseButton zIndex='sticky' />
        {nftModalMedia}
        {nftModalContent}
      </ModalContent>
    </Modal>
  )
}
