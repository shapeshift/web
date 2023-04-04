import type { TabProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Flex,
  Image,
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
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { ArrowRightUp } from 'components/Icons/ArrowRightUp'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { RawText } from 'components/Text'
import { ordinalSuffix } from 'context/WalletProvider/NativeWallet/components/NativeTestPhrase'
import { useModal } from 'hooks/useModal/useModal'
import type { V2ZapperNft } from 'state/apis/zapper/client'
import { breakpoints } from 'theme/theme'

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
  zapperNft: V2ZapperNft
}

export const NftModal: React.FC<NftModalProps> = ({ zapperNft }) => {
  const { nft } = useModal()
  const { close, isOpen } = nft
  const translate = useTranslate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const modalBg = useColorModeValue('white', 'gray.800')
  const modalHeaderBg = useColorModeValue('gray.50', 'gray.785')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const imageUrl = zapperNft?.medias?.[0]?.originalUrl
  const name = zapperNft?.name
  const collectionName = zapperNft?.collection?.name
  const collectionAddress = zapperNft?.collection?.address
  const hasCollectionData = Boolean(zapperNft?.collection)
  const rarityRank = zapperNft?.rarityRank

  const floorPriceEth = zapperNft?.collection.floorPriceEth
  const lastSaleEth = zapperNft?.lastSaleEth

  const rarityDisplay = rarityRank ? `${rarityRank}${ordinalSuffix(rarityRank)}` : null

  // const collectionLink = (() => {
  //   const zapperNetwork = zapperNft?.collection?.network
  //   if (!zapperNetwork) return null
  //   if (!collectionAddress) return null
  //   const chainId = zapperNetworkToChainId(zapperNetwork as SupportedZapperNetwork)
  //   return `https://opensea.io/collection/${collectionAddress}`
  // })()

  // console.log(JSON.stringify(zapperNft, null, 2))

  const nftModalImage = useMemo(() => {
    return (
      <Skeleton flex={1} isLoaded={imageLoaded}>
        <Flex
          flex={1}
          height='full'
          backgroundImage={imageUrl}
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
          >
            <Image
              width='full'
              height='auto'
              objectFit='contain'
              src={imageUrl}
              boxShadow='dark-lg'
              borderRadius='xl'
              mb={{ base: -14, md: 0 }}
              onLoad={() => setImageLoaded(true)}
            />
          </Flex>
        </Flex>
      </Skeleton>
    )
  }, [imageLoaded, imageUrl])

  const nftModalOverview = useMemo(() => {
    return (
      <Flex flexDir='column' px={8} pb={6} pt={12} bg={modalHeaderBg} gap={4}>
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex flexDir='column'>
            {collectionAddress && (
              <Button
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
        </Flex>
        <StatGroup>
          {floorPriceEth && (
            <Stat>
              <StatLabel>{translate('nft.floorPrice')}</StatLabel>
              <StatNumber>{floorPriceEth} ETH</StatNumber>
            </Stat>
          )}
          {lastSaleEth && (
            <Stat>
              <StatLabel>{translate('nft.lastPrice')}</StatLabel>
              <StatNumber>{lastSaleEth} ETH</StatNumber>
            </Stat>
          )}
          {rarityDisplay && (
            <Stat>
              <StatLabel>{translate('nft.rarity')}</StatLabel>
              <StatNumber>
                <Tag colorScheme='purple' variant='solid'>
                  <TagLeftIcon as={DiamondIcon} />
                  {rarityDisplay}
                </Tag>
              </StatNumber>
            </Stat>
          )}
        </StatGroup>
      </Flex>
    )
  }, [
    modalHeaderBg,
    collectionAddress,
    collectionName,
    name,
    translate,
    floorPriceEth,
    lastSaleEth,
    rarityDisplay,
  ])

  const nftModalDetails = useMemo(() => {
    return (
      <Tabs display='flex' flexDir='column' position='relative' variant='unstyled' flex={1}>
        <Box position='relative'>
          <TabList gap={4} px={8} bg={modalHeaderBg}>
            <NftTab>{translate('nft.overview')}</NftTab>
            {/* <NftTab>{translate('nft.properties')}</NftTab> */}
            {hasCollectionData && <NftTab>{translate('nft.collection')}</NftTab>}
          </TabList>
          <TabIndicator mt='-1.5px' height='2px' bg='blue.200' borderRadius='1px' />
        </Box>
        <TabPanels
          maxHeight={{ base: 'auto', md: '500px' }}
          minHeight='500px'
          overflowY='auto'
          flex={1}
        >
          <TabPanel p={0}>
            <NftOverview zapperNft={zapperNft} />
          </TabPanel>
          {/* <TabPanel p={0}>
            <NftProperties />
          </TabPanel> */}
        </TabPanels>
      </Tabs>
    )
  }, [hasCollectionData, modalHeaderBg, translate, zapperNft])

  const nftModalContent = useMemo(() => {
    return (
      <Flex flexDir='column' flex={1}>
        {nftModalOverview}
        {nftModalDetails}
      </Flex>
    )
  }, [nftModalOverview, nftModalDetails])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered={isLargerThanMd}>
      <ModalOverlay />
      <ModalContent
        maxWidth='container.lg'
        overflow='hidden'
        bg={modalBg}
        borderWidth={0}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <ModalCloseButton zIndex='sticky' />
        {nftModalImage}
        {nftModalContent}
      </ModalContent>
    </Modal>
  )
}
