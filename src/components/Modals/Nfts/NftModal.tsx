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
  Tag,
  TagLeftIcon,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { ArrowRightUp } from 'components/Icons/ArrowRightUp'
import { DiamondIcon } from 'components/Icons/DiamondIcon'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import type { V2ZapperNft } from 'state/apis/zapper/client'

type NftModalProps = {
  zapperNft: V2ZapperNft
}

export const NftModal: React.FC<NftModalProps> = ({ zapperNft }) => {
  const { nft } = useModal()
  const { close, isOpen } = nft

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
      <Flex backgroundImage={imageUrl} backgroundSize='cover' backgroundPosition='center center'>
        <Flex
          direction='row'
          alignItems='center'
          bg='blackAlpha.500'
          backdropFilter='auto'
          backdropBlur='xl'
          transform='translate3d(0, 0, 0)'
          width='full'
        >
          <Image borderRadius='lg' boxSize='300px' m={50} src={imageUrl} boxShadow='dark-lg' />
        </Flex>
      </Flex>
    )
  }, [imageUrl])

  const nftModalOverview = useMemo(() => {
    return (
      <Flex flexDir='column' px={8} pb={6} pt={12} flex={1} bg='#1C212E'>
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex flexDir='column'>
            {collectionAddress && (
              <Button
                size='sm'
                variant='link'
                color='blue.200'
                rightIcon={<ArrowRightUp boxSize='12px' />}
              >
                {collectionName}
              </Button>
            )}
            <RawText fontSize='lg' fontWeight='bold'>
              {name}
            </RawText>
          </Flex>
          <Tag size='sm' colorScheme='purple'>
            <TagLeftIcon as={DiamondIcon} />
            14th
          </Tag>
        </Flex>
        <StatGroup>
          <Stat>
            <StatLabel>Floor Price</StatLabel>
            <Amount.Fiat value='0.96' />
          </Stat>
        </StatGroup>
      </Flex>
    )
  }, [name, collectionAddress, collectionName])

  const nftModalDetails = useMemo(() => {}, [])

  const nftModalContent = useMemo(() => {
    return (
      <>
        {nftModalOverview}
        {nftModalDetails}
      </>
    )
  }, [nftModalOverview, nftModalDetails])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent maxWidth='container.lg' overflow='hidden' flexDir='row'>
        <ModalCloseButton />
        {nftModalImage}
        {nftModalContent}
      </ModalContent>
    </Modal>
  )
}
