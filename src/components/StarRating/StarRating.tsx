import { Flex, Icon, useColorModeValue } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { FaStar } from 'react-icons/fa'

interface StarRatingProps {
  rating: number
  onRatingChange: (rating: number) => void
  maxStars?: number
  size?: number
}

export const StarRating = memo(
  ({ rating, onRatingChange, maxStars = 5, size = 10 }: StarRatingProps) => {
    const [hoverRating, setHoverRating] = useState<number>(0)

    const filledColor = useColorModeValue('blue.500', 'blue.400')
    const emptyColor = useColorModeValue('gray.300', 'gray.600')
    const hoverColor = useColorModeValue('blue.400', 'blue.300')

    const stars = useMemo(() => {
      return Array.from({ length: maxStars }, (_, index) => index + 1)
    }, [maxStars])

    const handleMouseEnter = useCallback((starIndex: number) => {
      setHoverRating(starIndex)
    }, [])

    const handleMouseLeave = useCallback(() => {
      setHoverRating(0)
    }, [])

    const handleClick = useCallback(
      (starIndex: number) => {
        onRatingChange(starIndex)
      },
      [onRatingChange],
    )

    const getStarColor = useCallback(
      (starIndex: number) => {
        const currentRating = hoverRating || rating
        return starIndex <= currentRating ? filledColor : emptyColor
      },
      [hoverRating, rating, filledColor, emptyColor],
    )

    const starProps = useMemo(
      () => ({
        cursor: 'pointer',
        transition: 'color 0.2s ease-in-out',
        _hover: { color: hoverColor },
      }),
      [hoverColor],
    )

    return (
      <Flex gap={1} align='center' justify='center'>
        {stars.map(starIndex => (
          <Icon
            as={FaStar}
            key={starIndex}
            boxSize={size}
            color={getStarColor(starIndex)}
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
            {...starProps}
          />
        ))}
      </Flex>
    )
  },
)

StarRating.displayName = 'StarRating'
