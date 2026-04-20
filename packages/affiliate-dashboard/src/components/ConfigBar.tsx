import { Flex, HStack, Text } from '@chakra-ui/react'

import type { AffiliateConfig } from '../hooks/useAffiliateConfig'
import { bpsToPercent } from '../lib/format'

interface ConfigBarProps {
  config: AffiliateConfig
}

const Label = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Text
    fontSize='xs'
    fontWeight={500}
    color='fg.muted'
    textTransform='uppercase'
    letterSpacing='0.06em'
  >
    {children}
  </Text>
)

const Value = ({
  children,
  color = 'fg.bright',
}: {
  children: React.ReactNode
  color?: string
}): React.JSX.Element => (
  <Text fontSize='sm' fontWeight={600} color={color}>
    {children}
  </Text>
)

export const ConfigBar = ({ config }: ConfigBarProps): React.JSX.Element => (
  <Flex
    wrap='wrap'
    gap={{ base: 4, md: 6 }}
    px={{ base: 4, md: 5 }}
    py={3.5}
    bg='bg.surface'
    border='1px solid'
    borderColor='border.subtle'
    borderRadius='xl'
    mb={2}
  >
    <HStack spacing={2}>
      <Label>BPS</Label>
      <Value>
        {config.bps} ({bpsToPercent(config.bps)})
      </Value>
    </HStack>
    {config.partnerCode && (
      <HStack spacing={2}>
        <Label>Code</Label>
        <Value>{config.partnerCode}</Value>
      </HStack>
    )}
    <HStack spacing={2}>
      <Label>Status</Label>
      <Value color={config.isActive ? 'success' : 'danger'}>
        {config.isActive ? 'Active' : 'Inactive'}
      </Value>
    </HStack>
  </Flex>
)
