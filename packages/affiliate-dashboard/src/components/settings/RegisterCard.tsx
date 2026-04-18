import { Button, HStack, Input, InputGroup, InputRightAddon, Text } from '@chakra-ui/react'
import { useState } from 'react'

import { shortenAddress } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

interface RegisterCardProps {
  address: string
  isLoading: boolean
  onRegister: (bps: number) => void
}

const parseBps = (v: string): number => {
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? 30 : n
}

export const RegisterCard = ({
  address,
  isLoading,
  onRegister,
}: RegisterCardProps): React.JSX.Element => {
  const [bps, setBps] = useState('30')
  const percent = ((parseInt(bps, 10) || 0) / 100).toFixed(2)

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
            placeholder='30'
            min={0}
            max={1000}
          />
          <InputRightAddon
            bg='bg.surface'
            borderColor='border.input'
            fontFamily='mono'
            fontSize='xs'
          >
            {percent}%
          </InputRightAddon>
        </InputGroup>
        <Button
          onClick={() => onRegister(parseBps(bps))}
          isLoading={isLoading}
          loadingText='Registering...'
        >
          Register
        </Button>
      </HStack>
    </SettingsCard>
  )
}
