import { ArrowBackIcon } from '@chakra-ui/icons'
import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Flex, IconButton, SimpleGrid } from '@chakra-ui/react'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import React from 'react'
import { useHistory } from 'react-router'

const arrowBack = <ArrowBackIcon />
const paddingX = { base: 4, xl: 8 }
const paddingTop = { base: 'env(safe-area-inset-top)', md: 6 }
const position: ResponsiveValue<Property.Position> = { base: 'sticky', md: 'relative' }

export const PageBackButton = () => {
  const { goBack } = useHistory()
  return (
    <IconButton
      fontSize='2xl'
      variant='ghost'
      order='1'
      aria-label='go back'
      isRound
      onClick={goBack}
      icon={arrowBack}
    />
  )
}

type PageHeaderCompoundProps = {
  Left: React.FC<{ children: React.ReactNode }>
  Middle: React.FC<{ children: React.ReactNode }>
  Right: React.FC<{ children: React.ReactNode }>
}

export const PageHeader: React.FC<PropsWithChildren> & PageHeaderCompoundProps = ({ children }) => {
  return (
    <SimpleGrid
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
      maxWidth='container.4xl'
      px={paddingX}
      marginInline='auto'
    >
      {children}
    </SimpleGrid>
  )
}
const Left: React.FC<FlexProps> = props => <Flex order='1' whiteSpace='nowrap' {...props} />
const Middle: React.FC<FlexProps> = props => (
  <Flex
    order='2'
    textAlign='center'
    fontWeight='semibold'
    alignItems='center'
    justifyContent='center'
    whiteSpace='nowrap'
    {...props}
  />
)
const Right: React.FC<FlexProps> = props => (
  <Flex order='3' justifyContent='flex-end' alignItems='center' whiteSpace='nowrap' {...props} />
)

PageHeader.Left = Left
PageHeader.Middle = Middle
PageHeader.Right = Right
