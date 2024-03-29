import { Box, Flex, Link, useColorModeValue } from '@chakra-ui/react'

type CarouselDotsProps = {
  length: number
  activeIndex: number
  onClick: (newActiveIndex: number) => void
}

export const CarouselDots = ({ length, activeIndex, onClick }: CarouselDotsProps) => {
  const activeDotBackgroundColor = useColorModeValue('black', 'white')

  return (
    <Flex justifyContent='space-between'>
      {new Array(length).fill(undefined).map((_, i) => (
        <Box
          as={Link}
          key={i}
          width='7px'
          height='7px'
          borderRadius='50%'
          backgroundColor={i === activeIndex - 1 ? activeDotBackgroundColor : 'text.subtle'}
          // we need to pass an arg here, so we need an anonymous function wrapper
          // eslint-disable-next-line react-memo/require-usememo
          onClick={_ => onClick(i + 1)}
        />
      ))}
    </Flex>
  )
}
