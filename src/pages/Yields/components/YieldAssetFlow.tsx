import { Avatar, Box, Flex, Text, VStack } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useMemo } from 'react'

type YieldAssetFlowProps = {
  assetSymbol: string
  assetLogoURI: string
  providerName: string
  providerLogoURI: string | undefined
  direction?: 'enter' | 'exit'
}

export const YieldAssetFlow = memo(
  ({
    assetSymbol,
    assetLogoURI,
    providerName,
    providerLogoURI,
    direction = 'enter',
  }: YieldAssetFlowProps) => {
    const horizontalScroll = useMemo(
      () => keyframes`
      0% { background-position: 0 0; }
      100% { background-position: 28px 0; }
    `,
      [],
    )

    const flexDirection = useMemo(
      () => (direction === 'enter' ? 'row' : 'row-reverse') as 'row' | 'row-reverse',
      [direction],
    )

    return (
      <Flex
        alignItems='center'
        justify='center'
        py={6}
        gap={6}
        flexDirection={flexDirection}
        data-testid={`yield-asset-flow-${direction}`}
      >
        <VStack spacing={2}>
          <Box p={1} bg='background.surface.raised.base' borderRadius='full'>
            <Avatar size='md' src={assetLogoURI} name={assetSymbol} />
          </Box>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
            {assetSymbol}
          </Text>
        </VStack>
        <Box position='relative' flex={1} maxW='120px'>
          <Box h='2px' bg='border.base' borderRadius='full' />
          <Box
            position='absolute'
            top='50%'
            left={0}
            right={0}
            h='6px'
            transform='translateY(-50%)'
            opacity={0.6}
            backgroundImage='radial-gradient(circle, var(--chakra-colors-text-subtle) 2px, transparent 2.5px)'
            backgroundSize='14px 100%'
            animation={`${horizontalScroll} 3s infinite linear`}
            style={{
              maskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
            }}
          />
        </Box>
        <VStack spacing={2}>
          <Box p={1} bg='background.surface.raised.base' borderRadius='full'>
            <Avatar src={providerLogoURI} size='md' name={providerName} />
          </Box>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
            {providerName}
          </Text>
        </VStack>
      </Flex>
    )
  },
)
