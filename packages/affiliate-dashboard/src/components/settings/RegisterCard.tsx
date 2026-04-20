import { Button, HStack, Input, InputGroup, InputRightAddon, Text } from '@chakra-ui/react'
import { useState } from 'react'

import { DEFAULT_BPS, MAX_BPS, MIN_BPS } from '../../lib/constants'
import { bpsToPercent, parseBps, shortenAddress } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

interface RegisterCardProps {
  address: string
  isLoading: boolean
  onRegister: (bps: number) => void
}

export const RegisterCard = ({
  address,
  isLoading,
  onRegister,
}: RegisterCardProps): React.JSX.Element => {
  const [bps, setBps] = useState(String(DEFAULT_BPS))
  const parsedBps = parseBps(bps)

  return (
    <SettingsCard
      title='Register as Affiliate'
      description='Register your connected wallet to start earning fees on swaps.'
    >
      <Text fontSize='sm' fontFamily='mono' color='fg.muted' mb={3} opacity={0.8}>
        {shortenAddress(address)}
      </Text>
      <HStack spacing={3} wrap='wrap'>
        <InputGroup maxW='180px'>
          <Input
            type='number'
            value={bps}
            onChange={e => setBps(e.target.value)}
            placeholder={String(DEFAULT_BPS)}
            min={MIN_BPS}
            max={MAX_BPS}
          />
          <InputRightAddon
            bg='bg.surface'
            borderColor='border.input'
            fontFamily='mono'
            fontSize='xs'
          >
            {bpsToPercent(parsedBps ?? 0)}
          </InputRightAddon>
        </InputGroup>
        <Button
          onClick={() => onRegister(parsedBps ?? DEFAULT_BPS)}
          isLoading={isLoading}
          loadingText='Registering...'
        >
          Register
        </Button>
      </HStack>
    </SettingsCard>
  )
}
