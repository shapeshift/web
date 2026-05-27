import { Button, Flex, Input, InputGroup, InputRightAddon, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import { DEFAULT_BPS, MAX_BPS, MIN_BPS } from '../../lib/constants'
import { bpsToPercent, parseBps } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

interface RegisterCardProps {
  address: string
  isLoading: boolean
  onRegister: (bps: number) => void
}

const Row = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element => (
  <Flex
    justify='space-between'
    align='center'
    gap={4}
    py={2}
    borderBottom='1px solid'
    borderColor='border.muted'
    _last={{ borderBottom: 'none' }}
  >
    <Text fontSize='sm' color='fg.muted' flexShrink={0}>
      {label}
    </Text>
    {children}
  </Flex>
)

export const RegisterCard = ({
  address,
  isLoading,
  onRegister,
}: RegisterCardProps): React.JSX.Element => {
  const [bps, setBps] = useState(String(DEFAULT_BPS))
  const parsedBps = parseBps(bps)

  return (
    <SettingsCard
      title='Affiliate Registration'
      description='Earn swap fees whenever a user trades through your partner code.'
      headerRight={
        <Button
          onClick={() => onRegister(parsedBps ?? DEFAULT_BPS)}
          isLoading={isLoading}
          loadingText='Registering...'
        >
          Register
        </Button>
      }
    >
      <Stack spacing={2}>
        <Row label='Wallet'>
          <Text fontSize='sm' fontWeight={500} fontFamily='mono' color='fg.bright'>
            {address}
          </Text>
        </Row>
        <Row label='Affiliate BPS'>
          <InputGroup w='auto'>
            <Input
              type='number'
              value={bps}
              onChange={e => setBps(e.target.value)}
              placeholder={String(DEFAULT_BPS)}
              w='8ch'
              min={MIN_BPS}
              max={MAX_BPS}
            />
            <InputRightAddon
              bg='bg.surface'
              borderColor='border.input'
              fontFamily='mono'
              fontSize='sm'
              color='fg.muted'
            >
              {bpsToPercent(parsedBps ?? 0)}
            </InputRightAddon>
          </InputGroup>
        </Row>
      </Stack>
    </SettingsCard>
  )
}
