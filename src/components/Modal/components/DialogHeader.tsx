import type { BoxProps, FlexProps } from '@chakra-ui/react'
import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import React from 'react'

export type DialogHeaderCompound = {
  Left: React.FC<{ children: React.ReactNode }>
  Middle: React.FC<{ children: React.ReactNode }>
  Right: React.FC<{ children: React.ReactNode }>
}

export type DialogHeaderProps = { flexProps?: FlexProps } & BoxProps

const draggerDisplay = { base: 'block', md: 'none' }

export const DialogHeader: React.FC<DialogHeaderProps> & DialogHeaderCompound = ({
  children,
  flexProps,
  ...props
}) => {
  return (
    <Flex flexDir='column' position='relative' {...flexProps}>
      <Box
        mx='auto'
        width='36px'
        h='5px'
        flexShrink={0}
        borderRadius='full'
        bg='text.subtlest'
        position='absolute'
        display={draggerDisplay}
        top={2}
        left='50%'
        transform='translateX(-50%)'
        cursor='grab'
      />
      <SimpleGrid
        alignItems='center'
        gridTemplateColumns='44px 1fr 44px'
        fontWeight='bold'
        py={4}
        px={2}
        {...props}
      >
        {children}
      </SimpleGrid>
    </Flex>
  )
}

export const DialogHeaderLeft: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <Flex gridColumn={1}>{children}</Flex>
)

export const DialogHeaderMiddle: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <Flex gridColumn={2} alignItems='center' justifyContent='center'>
    {children}
  </Flex>
)

export const DialogHeaderRight: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <Flex gridColumn={3}>{children}</Flex>
)
DialogHeader.Left = DialogHeaderLeft
DialogHeader.Middle = DialogHeaderMiddle
DialogHeader.Right = DialogHeaderRight
