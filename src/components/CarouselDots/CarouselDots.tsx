import { Box, Flex } from '@chakra-ui/layout'

type CarouselDotsProps = {
  length: number
  activeIndex: number
}

export const CarouselDots = ({ length, activeIndex }: CarouselDotsProps) => (
  <Flex justifyContent='space-between'>
    {new Array(length).fill(undefined).map((_, i) => (
      <Box
        key={i}
        width='7px'
        height='7px'
        borderRadius='50%'
        backgroundColor={i === activeIndex - 1 ? 'white' : 'gray.500'}
      />
    ))}
  </Flex>
)
