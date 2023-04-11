import { Box, Flex, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { RawText, Text } from 'components/Text'

const exampleProperties = [
  {
    label: 'Mouth',
    value: 'M2 bored unshaven pizza',
  },
  {
    label: 'Earring',
    value: 'M2 cross',
  },
  {
    label: 'Clothes',
    value: 'M2 bayc t black',
  },
  {
    label: 'Fur',
    value: 'M2 cheetah',
  },
  {
    label: 'Background',
    value: 'M2 blue',
  },
  {
    label: 'Eyes',
    value: 'M2 coins',
  },
  {
    label: 'Hat',
    value: 'M2 party hat 1',
  },
]
export const NftProperties = () => {
  const bgColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const renderProperties = useMemo(() => {
    return exampleProperties.map(property => (
      <Box bg={bgColor} key={property.label} px={4} py={2} borderRadius='xl'>
        <RawText color='gray.500' fontWeight='bold'>
          {property.label}
        </RawText>
        <RawText fontWeight='medium'>{property.value}</RawText>
      </Box>
    ))
  }, [bgColor])
  return (
    <Flex gap={4} px={8} py={6} flexDir='column'>
      <Text fontWeight='medium' translation='nft.attributes' />
      <Flex gap={4} flexWrap='wrap'>
        {renderProperties}
      </Flex>
    </Flex>
  )
}
