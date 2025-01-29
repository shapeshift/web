import {
  Box,
  Flex,
  Image,
  Skeleton,
  Tag,
  TagLeftIcon,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import Placeholder from 'assets/placeholder.png'
import PlaceholderDrk from 'assets/placeholder-drk.png'
import { Amount } from 'components/Amount/Amount'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { selectNftById, selectNftCollectionById } from 'state/apis/nft/selectors'
import { getMediaType } from 'state/apis/zapper/validators'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type NftCardProps = {
  nftAssetId: AssetId
}

const flexStyle = {
  ':hover .nft-image': { transform: 'scale(1.4)' },
  ':hover .rarity-tag': { bg: 'white', color: 'black' },
}
const flexActive = { transform: 'translateY(2px)' }
const imageStyle = {
  opacity: 0.5,
  filter: 'grayscale(50%)',
}

export const NftCard: React.FC<NftCardProps> = ({ nftAssetId }) => {
  const nftItem = useAppSelector(state => selectNftById(state, nftAssetId))

  if (!nftItem) throw new Error(`NFT not found for assetId: ${nftAssetId}`)

  const { collectionId, medias, name, rarityRank } = nftItem

  const collection = useAppSelector(state => selectNftCollectionById(state, collectionId))
  const floorPrice = collection?.floorPrice
  const mediaUrl = medias?.[0]?.originalUrl
  const mediaType = getMediaType(mediaUrl)
  const bg = useColorModeValue('gray.50', 'gray.750')
  const bgHover = useColorModeValue('gray.100', 'gray.700')
  const placeholderImage = useColorModeValue(PlaceholderDrk, Placeholder)
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const [isMediaErrored, setIsMediaErrored] = useState(false)

  const handleMediaLoaded = useCallback(() => setIsMediaLoaded(true), [])
  const handleMediaErrored = useCallback(() => setIsMediaErrored(true), [])

  const chainId = fromAssetId(nftItem.assetId).chainId
  const maybeChainAdapter = getChainAdapterManager().get(chainId as ChainId)
  const maybeFeeAssetId = maybeChainAdapter?.getFeeAssetId()
  const maybeFeeAsset = useAppSelector(state => selectAssetById(state, maybeFeeAssetId ?? ''))

  const nftModal = useModal('nft')

  const flexHover = useMemo(() => ({ bg: bgHover }), [bgHover])

  const handleClick = useCallback(() => {
    if (!collection) return

    nftModal.open({ nftAssetId: nftItem.assetId })

    const mixpanel = getMixPanel()
    const eventData = {
      name: nftItem.name,
      id: nftItem.id,
      collectionName: collection.name,
      collectionAddress: fromAssetId(collection.assetId).assetReference,
      price: nftItem.price,
      collectionFloorPrice: collection.floorPrice,
      nftMediaUrls: (nftItem.medias ?? []).map(media => media.originalUrl),
    }

    mixpanel?.track(MixPanelEvent.ClickNft, eventData)
  }, [collection, nftItem, nftModal])

  const mediaBoxProps = useMemo(
    () =>
      ({
        objectFit: 'cover',
        className: 'nft-image',
        transitionDuration: '200ms',
        transitionProperty: 'all',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }) as const,
    [],
  )

  return (
    <Flex
      as='a'
      cursor='pointer'
      borderRadius='xl'
      overflow='hidden'
      flexDir='column'
      onClick={handleClick}
      bg={bg}
      _hover={flexHover}
      sx={flexStyle}
      _active={flexActive}
      transitionDuration='100ms'
      transitionProperty='all'
      transitionTimingFunction='cubic-bezier(0.4, 0, 0.2, 1)'
    >
      <Box paddingBottom='100%' position='relative' overflow='hidden'>
        {!mediaUrl || mediaType === 'image' ? (
          <Skeleton
            borderRadius='none'
            isLoaded={isMediaLoaded}
            position='absolute'
            width='full'
            height='full'
            left={0}
            top={0}
          >
            <Image
              src={!isMediaErrored && mediaUrl ? mediaUrl : placeholderImage}
              alt={name}
              onLoad={handleMediaLoaded}
              onError={handleMediaErrored}
              {...mediaBoxProps}
            />
          </Skeleton>
        ) : (
          <Box
            as='video'
            src={mediaUrl}
            loop
            // Needed because of chrome autoplay policy: https://developer.chrome.com/blog/autoplay/#new-behaviors
            muted
            autoPlay
            onCanPlayThrough={handleMediaLoaded}
            {...mediaBoxProps}
          />
        )}
        <Flex position='absolute' right='0.5rem' top='0.5rem' minHeight='24px' alignItems='center'>
          {rarityRank && (
            <Tag
              colorScheme='black'
              className='rarity-tag'
              flexShrink={0}
              backdropFilter='auto'
              backdropBlur='3xl'
              transform='translate3d(0, 0, 0)'
            >
              <TagLeftIcon as={DiamondIcon} />
              {rarityRank}
            </Tag>
          )}
          {maybeFeeAsset && (
            <Image
              src={maybeFeeAsset.networkIcon ?? maybeFeeAsset.icon}
              boxSize='17px'
              ml='8px'
              style={imageStyle}
            />
          )}
        </Flex>
      </Box>
      <Flex p={4} flexDir='column' height='100%'>
        <Flex justifyContent='space-between' alignItems='center'>
          <Text fontWeight='bold' fontSize='sm' wordBreak='break-word'>
            {name}
          </Text>
        </Flex>
        {floorPrice && maybeFeeAsset && (
          <Box mt='auto'>
            <Amount.Crypto
              color='text.subtle'
              fontWeight='bold'
              value={floorPrice}
              symbol={maybeFeeAsset.symbol}
            />
          </Box>
        )}
      </Flex>
    </Flex>
  )
}
