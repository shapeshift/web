import type { ResponsiveValue, TabProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Flex,
  IconButton,
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
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  baseChainId,
  ethChainId,
  fromAssetId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import { FaExclamationTriangle, FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import Placeholder from 'assets/placeholder.png'
import PlaceholderDrk from 'assets/placeholder-drk.png'
import { ArrowRightUp } from 'components/Icons/ArrowRightUp'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { ordinalSuffix } from 'context/WalletProvider/NativeWallet/components/NativeTestPhrase'
import { useModal } from 'hooks/useModal/useModal'
import { nft, nftApi, useGetNftCollectionQuery } from 'state/apis/nft/nftApi'
import { selectNftById, selectNftCollectionById } from 'state/apis/nft/selectors'
import { chainIdToOpenseaNetwork } from 'state/apis/nft/utils'
import { getMediaType } from 'state/apis/zapper/validators'
import { selectEnabledWalletAccountIds, selectWalletId } from 'state/slices/common-selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { NftCollection } from './components/NftCollection'
import { NftOverview } from './components/NftOverview'

const NftTab: React.FC<TabProps> = props => {
  const activeTabColor = useColorModeValue('blue.500', 'white')
  const tabSelectedStyle = useMemo(() => ({ color: activeTabColor }), [activeTabColor])

  return (
    <Tab color='text.subtle' fontWeight='medium' px={0} _selected={tabSelectedStyle} {...props} />
  )
}

export type NftModalProps = {
  nftAssetId: AssetId
}

const faSyncIcon = <FaSync />
const arrowRightUpIcon = <ArrowRightUp />
const faExclamationTriangleIcon = <FaExclamationTriangle />

const modalContentFlexDirProps: ResponsiveValue<Property.FlexDirection> = {
  base: 'column',
  md: 'row',
}
const paddingProps = { base: 8, md: 20 }
const justifyContextProps = { base: 'flex-start', md: 'center' }
const flexPositionProps: ResponsiveValue<Property.Position> = { base: 'static', md: 'absolute' }
const tabPanelsMaxHeight = { base: 'auto', md: '500px' }

export const NftModal: React.FC<NftModalProps> = ({ nftAssetId }) => {
  const dispatch = useAppDispatch()
  const nftModal = useModal('nft')
  const nftItem = useAppSelector(state => selectNftById(state, nftAssetId))

  // This should never happen but it may
  if (!nftItem) throw new Error(`NFT ${nftAssetId} not found`)

  const { close: handleClose, isOpen } = nftModal
  const translate = useTranslate()

  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const [isMediaErrored, setIsMediaErrored] = useState(false)
  const handleMediaLoaded = useCallback(() => setIsMediaLoaded(true), [])
  const handleMediaErrored = useCallback(() => setIsMediaErrored(true), [])

  const modalBg = useColorModeValue('white', 'gray.800')
  const modalHeaderBg = useColorModeValue('gray.50', 'gray.785')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const walletId = useAppSelector(selectWalletId)
  const accountIds = useAppSelector(selectEnabledWalletAccountIds)

  useGetNftCollectionQuery(
    { accountIds, collectionId: nftItem.collectionId },
    { skip: !nftItem.collectionId },
  )

  const nftCollection = useAppSelector(state =>
    selectNftCollectionById(state, nftItem.collectionId),
  )

  const mediaUrl = nftItem.medias[0]?.originalUrl
  const mediaType = getMediaType(mediaUrl)
  const placeholderImage = useColorModeValue(PlaceholderDrk, Placeholder)

  const name = nftItem.name
  const nftAddress = fromAssetId(nftAssetId).assetReference
  const collectionName = nftCollection?.name
  const rarityRank = nftItem.rarityRank
  const floorPrice = nftCollection?.floorPrice
  const price = nftItem.price
  const openseaId = nftCollection?.openseaId
  const chainId = nftCollection?.chainId
  const maybeChainAdapter = getChainAdapterManager().get(chainId as ChainId)
  const maybeFeeAssetId = maybeChainAdapter?.getFeeAssetId()
  const maybeFeeAsset = useAppSelector(state => selectAssetById(state, maybeFeeAssetId ?? ''))
  const collectionOpenseaNetwork = chainIdToOpenseaNetwork(chainId as ChainId)
  const collectionLink = openseaId ? `https://opensea.io/collection/${openseaId}` : null
  const rarityDisplay = rarityRank ? `${rarityRank}${ordinalSuffix(rarityRank)}` : null
  const assetLink = collectionOpenseaNetwork
    ? `https://opensea.io/assets/${collectionOpenseaNetwork}/${nftAddress}`
    : null
  const customizeLink = nftCollection?.socialLinks?.find(link => link.key === 'customizeFoxatar')

  const mediaBoxProps = useMemo(
    () =>
      ({
        width: 'full',
        height: 'auto',
        objectFit: 'contain',
        boxShadow: 'dark-lg',
        borderRadius: 'xl',
        mb: { base: -14, md: 0 },
      }) as const,
    [],
  )

  const handleSetAsAvatarClick = useCallback(() => {
    if (!walletId) return
    dispatch(nft.actions.setWalletSelectedNftAvatar({ nftAssetId, walletId }))
  }, [dispatch, nftAssetId, walletId])

  const handleRefreshClick = useCallback(() => {
    dispatch(nftApi.endpoints.getNft.initiate({ assetId: nftAssetId }, { forceRefetch: true }))
  }, [dispatch, nftAssetId])

  const handleReportSpamClick = useCallback(async () => {
    const { assetReference: address, chainId } = fromAssetId(nftItem.collectionId)
    const alchemyUri = (() => {
      switch (chainId) {
        case polygonChainId:
          return `${getConfig().REACT_APP_ALCHEMY_POLYGON_JAYPEGS_BASE_URL}/${
            getConfig().REACT_APP_ALCHEMY_API_KEY
          }`
        case ethChainId:
          return `${getConfig().REACT_APP_ALCHEMY_ETHEREUM_JAYPEGS_BASE_URL}/${
            getConfig().REACT_APP_ALCHEMY_API_KEY
          }`
        case optimismChainId:
          return `${getConfig().REACT_APP_ALCHEMY_OPTIMISM_JAYPEGS_BASE_URL}/${
            getConfig().REACT_APP_ALCHEMY_API_KEY
          }`
        case arbitrumChainId:
          return `${getConfig().REACT_APP_ALCHEMY_ARBITRUM_JAYPEGS_BASE_URL}/${
            getConfig().REACT_APP_ALCHEMY_API_KEY
          }`
        case baseChainId:
          return `${getConfig().REACT_APP_ALCHEMY_BASE_JAYPEGS_BASE_URL}/${
            getConfig().REACT_APP_ALCHEMY_API_KEY
          }`
        default:
          return undefined
      }
    })()

    try {
      if (!nftCollection) throw new Error(`NFT collection for ${nftItem.collectionId} not found`)
      dispatch(
        nft.actions.upsertCollection({
          ...nftCollection,
          isSpam: true,
        }),
      )

      // Alchemy only supports spam reporting for Ethereum, Polygon, Optimism, Arbitrum and Base
      if (
        ![ethChainId, polygonChainId, optimismChainId, arbitrumChainId, baseChainId].includes(
          chainId,
        )
      )
        return

      await axios.get<string>(`${alchemyUri!}/reportSpam`, { params: { address } })
    } catch (e) {
      console.error(e)
    } finally {
      handleClose()
    }
  }, [dispatch, handleClose, nftCollection, nftItem.collectionId])

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
            p={paddingProps}
            justifyContent={justifyContextProps}
            bg='blackAlpha.500'
            transition='all 1s ease-in-out'
            backdropFilter='auto'
            backdropBlur='3xl'
            transform='translate3d(0, 0, 0)'
            width='full'
            flexDir='column'
            gap={4}
          >
            <Flex position={flexPositionProps} right='1em' top='1em' gap='1em'>
              <IconButton
                size='sm'
                colorScheme='whiteAlpha'
                onClick={handleRefreshClick}
                icon={faSyncIcon}
                aria-label={translate('nft.refresh')}
              />
              {customizeLink && (
                <Button
                  as={Link}
                  isExternal
                  href={customizeLink.url}
                  size='sm'
                  colorScheme='whiteAlpha'
                  rightIcon={arrowRightUpIcon}
                >
                  {translate(`nft.${customizeLink.key}`)}
                </Button>
              )}
              {assetLink && (
                <Button
                  as={Link}
                  isExternal
                  href={assetLink}
                  size='sm'
                  colorScheme='whiteAlpha'
                  rightIcon={arrowRightUpIcon}
                >
                  OpenSea
                </Button>
              )}
              <Button
                as={Link}
                size='sm'
                colorScheme='whiteAlpha'
                rightIcon={faExclamationTriangleIcon}
                onClick={handleReportSpamClick}
              >
                {translate('nft.reportSpam')}
              </Button>
            </Flex>
            {!mediaUrl || mediaType === 'image' ? (
              <>
                <Image
                  src={mediaUrl && !isMediaErrored ? mediaUrl : placeholderImage}
                  onLoad={handleMediaLoaded}
                  onError={handleMediaErrored}
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
                onCanPlayThrough={handleMediaLoaded}
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
    customizeLink,
    handleMediaLoaded,
    handleMediaErrored,
    handleRefreshClick,
    handleReportSpamClick,
    handleSetAsAvatarClick,
    isMediaLoaded,
    isMediaErrored,
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
                rightIcon={arrowRightUpIcon}
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
    if (!nftCollection) return null

    const hasUsefulCollectionData = Boolean(
      nftCollection.name && (nftCollection.description || nftCollection.socialLinks.length),
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
        <TabPanels maxHeight={tabPanelsMaxHeight} overflowY='auto' flex={1}>
          <TabPanel p={0}>
            <NftOverview nftItem={nftItem} />
          </TabPanel>
          {hasUsefulCollectionData && (
            <TabPanel p={0}>
              <NftCollection
                name={nftCollection.name}
                description={nftCollection.description}
                socialLinks={nftCollection.socialLinks}
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered={isLargerThanMd}>
      <ModalOverlay />
      <ModalContent
        maxWidth='container.lg'
        overflow='hidden'
        bg={modalBg}
        borderWidth={0}
        flexDir={modalContentFlexDirProps}
      >
        <ModalCloseButton zIndex='sticky' />
        {nftModalMedia}
        {nftModalContent}
      </ModalContent>
    </Modal>
  )
}
