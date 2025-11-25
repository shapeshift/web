import { Box, Flex, Link } from '@chakra-ui/react'

type CarouselDotsProps = {
  length: number
  activeIndex: number
  onClick?: (newActiveIndex: number) => void
  activeDotBackgroundColor?: string
  inactiveDotBackgroundColor?: string
}

export const CarouselDots = ({
  length,
  activeIndex,
  onClick,
  activeDotBackgroundColor = 'blue.500',
  inactiveDotBackgroundColor = 'text.subtle',
}: CarouselDotsProps) => {
  return (
    <Flex justifyContent='space-between'>
      {new Array(length).fill(undefined).map((_, i) => (
        <Box
          as={Link}
          key={i}
          width='7px'
          height='7px'
          borderRadius='50%'
          backgroundColor={
            i === activeIndex - 1 ? activeDotBackgroundColor : inactiveDotBackgroundColor
          }
          // we need to pass an arg here, so we need an anonymous function wrapper
          onClick={() => onClick?.(i + 1)}
        />
      ))}
    </Flex>
  )
}
