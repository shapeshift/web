import { ArrowBackIcon } from '@chakra-ui/icons'
import type { FlexProps, IconButtonProps, ResponsiveValue, TextProps } from '@chakra-ui/react'
import { Container, Flex, IconButton } from '@chakra-ui/react'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { RawText } from '@/components/Text'

const arrowBack = <ArrowBackIcon />

const paddingTop = {
  base: 'calc(env(safe-area-inset-top) + var(--safe-area-inset-top))',
  md: 6,
}
const position: ResponsiveValue<Property.Position> = { base: 'sticky', md: 'relative' }

export const PageBackButton: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <IconButton
      fontSize='2xl'
      variant='ghost'
      aria-label='go back'
      isRound
      onClick={onBack ?? handleGoBack}
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

export const PageHeader: React.FC<PropsWithChildren> & PageHeaderCompoundProps = ({ children }) => {
  return (
    <Container
      display='grid'
      gridTemplateColumns='1fr auto 1fr'
      alignItems='center'
      position={position}
      top={0}
      left={0}
      right={0}
      bg='background.surface.alpha'
      backdropFilter='blur(30px)'
      pt={paddingTop}
      zIndex='sticky'
      pb={2}
      width='full'
      maxWidth='container.3xl'
      marginInline='auto'
    >
      {children}
    </Container>
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
const fontSizeMd2xl = { base: 'xl', md: '2xl' }
const Title: React.FC<TextProps> = props => (
  <RawText fontSize={fontSizeMd2xl} textAlign='center' {...props} />
)

PageHeader.Left = Left
PageHeader.Middle = Middle
PageHeader.Right = Right
PageHeader.Title = Title
