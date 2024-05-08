import { ArrowBackIcon } from '@chakra-ui/icons'
import type {
  FlexProps,
  IconButtonProps,
  ResponsiveValue,
  SimpleGridProps,
  TextProps,
} from '@chakra-ui/react'
import { Flex, IconButton, SimpleGrid } from '@chakra-ui/react'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

const arrowBack = <ArrowBackIcon />
const paddingX = { base: 4, xl: 8 }
const paddingTop = { base: 'env(safe-area-inset-top)', md: 4 }
const position: ResponsiveValue<Property.Position> = { base: 'sticky', md: 'relative' }
const pageHeaderBg = { base: 'background.surface.alpha', md: 'transparent' }

export const PageBackButton: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { history } = useBrowserRouter()
  const { goBack } = history
  return (
    <IconButton
      fontSize='2xl'
      variant='ghost'
      aria-label='go back'
      isRound
      onClick={onBack ?? goBack}
      icon={arrowBack}
    />
  )
}

export const PageHeaderButton: React.FC<IconButtonProps> = props => (
  <IconButton variant='ghost' isRound fontSize='2xl' {...props} />
)

type PageHeaderCompoundProps = {
  Left: React.FC<{ children: React.ReactNode }>
  Middle: React.FC<{ children: React.ReactNode }>
  Right: React.FC<{ children: React.ReactNode }>
  Title: React.FC<{ children: React.ReactNode }>
}

type PageHeaderProps = {
  containerProps?: SimpleGridProps
} & PropsWithChildren

export const PageHeader: React.FC<PageHeaderProps> & PageHeaderCompoundProps = ({
  children,
  containerProps,
}) => {
  return (
    <SimpleGrid
      gridTemplateColumns='1fr auto 1fr'
      alignItems='center'
      position={position}
      top={0}
      left={0}
      right={0}
      bg={pageHeaderBg}
      backdropFilter='blur(30px)'
      pt={paddingTop}
      zIndex='sticky'
      pb={2}
      width='full'
      maxWidth='container.4xl'
      px={paddingX}
      marginInline='auto'
      {...containerProps}
    >
      {children}
    </SimpleGrid>
  )
}
const Left: React.FC<FlexProps> = props => (
  <Flex gridColumn='1' whiteSpace='nowrap' gap={2} alignItems='center' {...props} />
)
const Middle: React.FC<FlexProps> = props => (
  <Flex
    gridColumn='2'
    textAlign='center'
    fontWeight='semibold'
    alignItems='center'
    justifyContent='center'
    whiteSpace='nowrap'
    minHeight='40px'
    {...props}
  />
)
const Right: React.FC<FlexProps> = props => (
  <Flex
    gridColumn='3'
    justifyContent='flex-end'
    alignItems='center'
    whiteSpace='nowrap'
    {...props}
  />
)
const fontSizeMd2xl = { base: 'xl', md: 'lg' }
const Title: React.FC<TextProps> = props => (
  <RawText fontSize={fontSizeMd2xl} textAlign='center' {...props} />
)

PageHeader.Left = Left
PageHeader.Middle = Middle
PageHeader.Right = Right
PageHeader.Title = Title
