import { Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
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

  return (
    <Flex
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
