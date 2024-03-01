import { ArrowBackIcon } from '@chakra-ui/icons'
import { Flex, IconButton, SimpleGrid } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

type SubPageProps = {
  title?: string
  onBack?: () => void
  rightComponent?: React.ReactNode
  height?: string
} & PropsWithChildren

const arrowBackIcon = <ArrowBackIcon />

export const SubPage: React.FC<SubPageProps> = ({
  title,
  onBack,
  rightComponent,
  height,
  children,
}) => {
  const translate = useTranslate()
  const { history } = useBrowserRouter()
  const { goBack } = history
  return (
    <Flex flexDir='column' width='full' height={height}>
      <SimpleGrid
        gridTemplateColumns='0.5fr 1fr 0.5fr'
        position='sticky'
        top={0}
        bg='background.surface.base'
        zIndex='sticky'
        py={4}
        px={4}
        pt='calc(env(safe-area-inset-top) + 1rem)'
      >
        <Flex>
          <IconButton
            variant='ghost'
            icon={arrowBackIcon}
            aria-label={translate('common.back')}
            fontSize='xl'
            size='md'
            isRound
            onClick={onBack ?? goBack}
          />
        </Flex>
        <Flex
          alignItems='center'
          justifyContent='center'
          textOverflow='ellipsis'
          fontWeight='semibold'
        >
          {title}
        </Flex>
        <Flex justifyContent='flex-end'>{rightComponent}</Flex>
      </SimpleGrid>
      {children}
    </Flex>
  )
}
