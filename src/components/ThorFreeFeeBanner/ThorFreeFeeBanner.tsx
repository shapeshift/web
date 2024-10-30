import { Box, Card, CardBody, Link } from '@chakra-ui/react'
import { Text } from 'components/Text'

import icons from './asset-icons.png'

const cardHover = {
  textDecoration: 'none',
  opacity: '.7',
}

const cardBefore = {
  content: "''",
  backgroundImage: icons,
  position: 'absolute',
  top: 0,
  left: 0,
  width: '115px',
  height: '100%',
  backgroundPosition: 'left center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  zIndex: 1,
  pointerEvents: 'none',
}

export const ThorFreeFeeBanner = () => {
  return (
    <Card
      as={Link}
      href='#'
      width='full'
      maxWidth='500px'
      transition='.25s ease-out'
      _hover={cardHover}
      position='relative'
      overflow='hidden'
      mb={4}
      _before={cardBefore}
    >
      <CardBody
        paddingLeft='115px'
        background='radial-gradient(22.82% 115.62% at 8.08% 149.06%, #FFCF73 0%, rgba(255, 207, 115, 0) 100%), radial-gradient(22.71% 111.02% at 7.4% 0%, #0A3B45 0%, rgba(10, 59, 69, 0) 100%)'
      >
        <Box maxWidth='350px' ml='auto' width='full'>
          <Text translation='thorFees.title' fontSize='sm' fontWeight='bold' />
          <Text translation='thorFees.description' my={1} fontSize='sm' color='text.subtle' />
          <Text translation='common.learnMore' fontSize='sm' fontWeight='bold' color='blue.300' />
        </Box>
      </CardBody>
    </Card>
  )
}
