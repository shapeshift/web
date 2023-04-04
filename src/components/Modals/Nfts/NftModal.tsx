import {
  Button,
  Flex,
  Image,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
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
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { ArrowRightUp } from 'components/Icons/ArrowRightUp'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import type { V2ZapperNft } from 'state/apis/zapper/client'

import { NftOverview } from './components/NftOverview'
import { NftProperties } from './components/NftProperties'

type NftModalProps = {
  zapperNft: V2ZapperNft
}

export const NftModal: React.FC<NftModalProps> = ({ zapperNft }) => {
  const { nft } = useModal()
  const { close, isOpen } = nft
  const translate = useTranslate()

  const imageUrl = zapperNft?.medias?.[0]?.originalUrl
  const name = zapperNft?.name
  const collectionName = zapperNft?.collection?.name
  const collectionAddress = zapperNft?.collection?.address

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
      <Flex
        backgroundImage={imageUrl}
        backgroundSize='cover'
        backgroundPosition='center center'
        flex={1}
      >
        <Flex
          direction='row'
          alignItems='center'
          p={{ base: 8, md: 20 }}
          justifyContent={{ base: 'flex-start', md: 'center' }}
          bg='blackAlpha.500'
          backdropFilter='auto'
          backdropBlur='xl'
          transform='translate3d(0, 0, 0)'
          width='full'
        >
          <Image
            borderRadius='xl'
            boxSize={{ base: '150px', md: '350px' }}
            src={imageUrl}
            boxShadow='dark-lg'
            mb={{ base: -14, md: 0 }}
          />
        </Flex>
      </Flex>
    )
  }, [imageUrl])

  const nftModalOverview = useMemo(() => {
    return (
      <Flex flexDir='column' px={8} pb={6} pt={12} bg='#1C212E' gap={4}>
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
          <Tag colorScheme='purple' variant='solid'>
            <TagLeftIcon as={DiamondIcon} />
            14th
          </Tag>
        </Flex>
        <StatGroup>
          <Stat>
            <StatLabel>Floor Price</StatLabel>
            <StatNumber>
              <Amount.Fiat value='0.96' />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Last Price</StatLabel>
            <StatNumber>
              <Amount.Fiat value='0.96' />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Rarity</StatLabel>
            <StatNumber>14th/19,462</StatNumber>
          </Stat>
        </StatGroup>
      </Flex>
    )
  }, [name, collectionAddress, collectionName])

  const nftModalDetails = useMemo(() => {
    return (
      <Tabs position='relative' variant='unstyled' flex={1}>
        <TabList gap={4} px={8} bg='#1C212E'>
          <Tab color='gray.500' px={0} _selected={{ color: 'white' }}>
            {translate('nft.overview')}
          </Tab>
          <Tab color='gray.500' px={0} _selected={{ color: 'white' }}>
            {translate('nft.properties')}
          </Tab>
          <Tab color='gray.500' px={0} _selected={{ color: 'white' }}>
            {translate('nft.collection')}
          </Tab>
        </TabList>
        <TabIndicator mt='-1.5px' height='2px' bg='blue.200' borderRadius='1px' />
        <TabPanels bg='gray.800'>
          <TabPanel p={0}>
            <NftOverview />
          </TabPanel>
          <TabPanel p={0}>
            <NftProperties />
          </TabPanel>
        </TabPanels>
      </Tabs>
    )
  }, [translate])

  const nftModalContent = useMemo(() => {
    return (
      <Flex flexDir='column' flex={1}>
        {nftModalOverview}
        {nftModalDetails}
      </Flex>
    )
  }, [nftModalOverview, nftModalDetails])

  return (
    <Modal isOpen={isOpen} onClose={close}>
      <ModalOverlay />
      <ModalContent
        maxWidth='container.lg'
        overflow='hidden'
        flexDir={{ base: 'column', md: 'row' }}
      >
        <ModalCloseButton zIndex='sticky' />
        {nftModalImage}
        {nftModalContent}
      </ModalContent>
    </Modal>
  )
}
