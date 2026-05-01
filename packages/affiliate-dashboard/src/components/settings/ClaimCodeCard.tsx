import { Button, HStack, Input } from '@chakra-ui/react'
import { useState } from 'react'

import { SettingsCard } from './SettingsCard'

interface ClaimCodeCardProps {
  isLoading: boolean
  onClaim: (code: string) => Promise<void>
}

export const ClaimCodeCard = ({ isLoading, onClaim }: ClaimCodeCardProps): React.JSX.Element => {
  const [code, setCode] = useState('')
  const disabled = !code.trim()

  const handleClaim = async (): Promise<void> => {
    try {
      await onClaim(code.trim())
      setCode('')
    } catch {
      // error surfaced via useAffiliateActions.onError; preserve input for retry
    }
  }

  return (
    <SettingsCard
      title='Claim Partner Code'
      description='Claim a unique partner code for your affiliate link.'
    >
      <HStack spacing={3} wrap='wrap'>
        <Input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder='Enter partner code'
          spellCheck={false}
          flex='1'
          minW='180px'
        />
        <Button
          onClick={() => void handleClaim()}
          isDisabled={disabled}
          isLoading={isLoading}
          loadingText='Claiming...'
        >
          Claim
        </Button>
      </HStack>
    </SettingsCard>
  )
}
