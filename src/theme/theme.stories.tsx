/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */
import { Box, Center, CenterProps, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { Fragment } from 'react'

import { theme } from './theme'

export default {
  title: 'Theme/Styles',
  decorators: [
    (Story: any) => (
      <Container mt='40px' maxW='unset'>
        <Story />
      </Container>
    )
  ]
}

export const Colors = () => {
  return Object.keys(theme.colors).map(category => {
    const colorCategory = theme.colors[category]
    return (
      <Fragment key={category}>
        <Heading>{category}</Heading>
        <Flex flexWrap='wrap' mb='10'>
          {typeof colorCategory === 'string' ? (
            <>
              <Center h='250px' w='250px' flexDir='column' backgroundColor={colorCategory}>
                <Text fontWeight='bold'>{category}</Text>
                <Text fontWeight='bold'>{colorCategory}</Text>
              </Center>
            </>
          ) : (
            <>
              {Object.keys(colorCategory).map(colorKey => {
                const value = colorCategory[colorKey]
                return (
                  <Center
                    key={`${category}.${colorKey}`}
                    h='250px'
                    w='250px'
                    flexDir='column'
                    backgroundColor={value}
                  >
                    <Text fontWeight='bold'>{`${category}.${colorKey}`}</Text>
                    <Text fontWeight='bold'>{value}</Text>
                  </Center>
                )
              })}
            </>
          )}
        </Flex>
      </Fragment>
    )
  })
}

const SpacingSquare: React.FC<CenterProps> = ({ mb }) => (
  <Flex>
    <Center w='50px'>
      <Text fontWeight='bold'>{mb}</Text>
    </Center>
    <Box backgroundColor='green.500' pl={mb}>
      <Center h='40px' backgroundColor='bg.normal' />
    </Box>
  </Flex>
)

export const Spacing = () => (
  <>
    <Box>
      <SpacingSquare mb={1} />
      <SpacingSquare mb={2} />
      <SpacingSquare mb={3} />
      <SpacingSquare mb={4} />
      <SpacingSquare mb={5} />
      <SpacingSquare mb={6} />
      <SpacingSquare mb={7} />
      <SpacingSquare mb={8} />
      <SpacingSquare mb={9} />
      <SpacingSquare mb={10} />
      <SpacingSquare mb={12} />
      <SpacingSquare mb={14} />
      <SpacingSquare mb={16} />
      <SpacingSquare mb={20} />
      <SpacingSquare mb={24} />
      <SpacingSquare mb={28} />
      <SpacingSquare mb={32} />
      <SpacingSquare mb={36} />
      <SpacingSquare mb={40} />
      <SpacingSquare mb={44} />
      <SpacingSquare mb={48} />
      <SpacingSquare mb={52} />
      <SpacingSquare mb={56} />
      <SpacingSquare mb={60} />
      <SpacingSquare mb={64} />
      <SpacingSquare mb={72} />
      <SpacingSquare mb={80} />
      <SpacingSquare mb={96} />
    </Box>
  </>
)

export const fontSizes = () => (
  <>
    <Text fontSize='xs'>(xs) fontSize</Text>
    <Text fontSize="small">(sm) fontSize</Text>
    <Text fontSize='md'>(md) fontSize this is the default size</Text>
    <Text fontSize="large">(lg) fontSize</Text>
    <Text fontSize='xl'>(xl) fontSize</Text>
    <Text fontSize='2xl'>(2xl) fontSize</Text>
    <Text fontSize='3xl'>(3xl) fontSize</Text>
    <Text fontSize='4xl'>(4xl) fontSize</Text>
    <Text fontSize='5xl'>(5xl) fontSize</Text>
    <Text fontSize='6xl'>(6xl) fontSize</Text>
    <Text fontSize='7xl'>(7xl) fontSize</Text>
    <Text fontSize='8xl'>(8xl) fontSize</Text>
    <Text fontSize='9xl'>(9xl) fontSize</Text>
  </>
)
