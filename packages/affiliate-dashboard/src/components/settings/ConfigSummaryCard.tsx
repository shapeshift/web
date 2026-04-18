import { Flex, Stack, Text } from '@chakra-ui/react'

import type { AffiliateConfig } from '../../hooks/useAffiliateConfig'
import { bpsToPercent, formatDate } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

interface ConfigSummaryCardProps {
  config: AffiliateConfig
}

const Row = ({
  label,
  children,
  mono,
  color = 'fg.bright',
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
  color?: string
}): React.JSX.Element => (
  <Flex
    justify='space-between'
    align='center'
    gap={4}
    py={2}
    borderBottom='1px solid'
    borderColor='border.muted'
  >
    <Text fontSize='sm' color='fg.muted' flexShrink={0}>
      {label}
    </Text>
    <Text
      fontSize='sm'
      fontWeight={500}
      color={color}
      fontFamily={mono ? 'mono' : undefined}
      textAlign='right'
      wordBreak='break-all'
    >
      {children}
    </Text>
  </Flex>
)

export const ConfigSummaryCard = ({ config }: ConfigSummaryCardProps): React.JSX.Element => (
  <SettingsCard title='Current Configuration'>
    <Stack spacing={0}>
      <Row label='Wallet' mono>
        {config.walletAddress}
      </Row>
      <Row label='Receive Address' mono>
        {config.receiveAddress ?? config.walletAddress}
      </Row>
      <Row label='BPS'>
        {config.bps} ({bpsToPercent(config.bps)})
      </Row>
      <Row label='Partner Code'>{config.partnerCode ?? 'None'}</Row>
      <Row label='Status' color={config.isActive ? 'success' : 'danger'}>
        {config.isActive ? 'Active' : 'Inactive'}
      </Row>
      <Row label='Created'>{formatDate(config.createdAt)}</Row>
    </Stack>
  </SettingsCard>
)
