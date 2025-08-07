import { Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { exploreTagsIcons, PortalsTags } from '../constant'

import { MarketsCategories } from '@/pages/Markets/constants'

const containerSx = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

export const Tags = () => {
  const translate = useTranslate()
  const tags = useMemo(() => Object.values(PortalsTags), [])
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const { tag: tagParam } = useParams<{ tag?: string }>()

  const buttonTextColor = useColorModeValue('white', 'white')
  const activeBgColor = useColorModeValue('black', 'white')
  const activeTextColor = useColorModeValue('white', 'black')
  const navigate = useNavigate()

  const handleClick = useCallback(
    (tag: string) => {
      navigate(`/explore/category/${MarketsCategories.OneClickDefi}/${tag}`)
    },
    [navigate],
  )

  const activeStyle = useMemo(() => {
    return {
      bg: activeBgColor,
      color: activeTextColor,
    }
  }, [activeBgColor, activeTextColor])

  useEffect(() => {
    if (tagParam && buttonRefs.current[tagParam] && containerRef.current) {
      const selectedButton = buttonRefs.current[tagParam]

      if (!selectedButton) return

      const container = containerRef.current

      const buttonRect = selectedButton.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Calculate if the button is outside the visible area
      const isButtonLeftOfContainer = buttonRect.left < containerRect.left
      const isButtonRightOfContainer = buttonRect.right > containerRect.right

      if (isButtonLeftOfContainer || isButtonRightOfContainer) {
        // Calculate scroll position to center the button
        const scrollLeft =
          selectedButton.offsetLeft - container.offsetWidth / 2 + selectedButton.offsetWidth / 2

        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth',
        })
      }
    }
  }, [tagParam])

  const handleButtonRef = useCallback((element: HTMLButtonElement | null, tag: string) => {
    buttonRefs.current[tag] = element
  }, [])

  return (
    <Flex
      ref={containerRef}
      alignItems='center'
      gap={2}
      overflowX='auto'
      mx={-4}
      py={2}
      sx={containerSx}
      pl={4}
      mb={2}
    >
      {tags.map(tag => (
        <Button
          key={tag}
          // eslint-disable-next-line react-memo/require-usememo
          ref={element => handleButtonRef(element, tag)}
          size='sm'
          variant='ghost'
          borderRadius='full'
          px={4}
          py={2}
          bg={tagParam === tag ? activeBgColor : 'background.surface.raised.base'}
          color={tagParam === tag ? activeTextColor : buttonTextColor}
          _hover={activeStyle}
          _active={activeStyle}
          _focus={activeStyle}
          _visited={activeStyle}
          leftIcon={exploreTagsIcons[tag] ?? undefined}
          fontWeight='medium'
          fontSize='sm'
          transition='all 0.2s'
          flexShrink={0}
          // eslint-disable-next-line react-memo/require-usememo
          onClick={() => handleClick(tag)}
        >
          {translate(`explore.tags.${tag}`)}
        </Button>
      ))}
    </Flex>
  )
}
