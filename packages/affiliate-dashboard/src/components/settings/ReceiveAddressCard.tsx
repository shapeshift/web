import { Button, HStack, Input } from '@chakra-ui/react'
import { useState } from 'react'

import type { ActionMessage } from '../../hooks/useAffiliateActions'
import type { AffiliateConfig } from '../../hooks/useAffiliateConfig'
import { SettingsCard } from './SettingsCard'

interface ReceiveAddressCardProps {
  config: AffiliateConfig
  isLoading: boolean
  onUpdate: (address: string) => Promise<void>
  onValidationError: (message: ActionMessage) => void
}

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

export const ReceiveAddressCard = ({
  config,
  isLoading,
  onUpdate,
  onValidationError,
}: ReceiveAddressCardProps): React.JSX.Element => {
  const [address, setAddress] = useState('')
  const disabled = !address.trim()

  const currentAddress = config.receiveAddress ?? config.walletAddress

  const handleUpdate = async (): Promise<void> => {
    const trimmed = address.trim()
    if (!ADDRESS_REGEX.test(trimmed)) {
      onValidationError({ type: 'error', text: 'Invalid EVM address' })
      return
    }
    await onUpdate(trimmed)
    setAddress('')
  }

  return (
    <SettingsCard
      title='Receive Address'
      description='Destination for affiliate revenue. Defaults to your connected wallet.'
    >
      <HStack spacing={3} wrap='wrap'>
        <Input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder={currentAddress}
          spellCheck={false}
          flex='1'
          minW='180px'
        />
        <Button
          onClick={() => void handleUpdate()}
          isDisabled={disabled}
          isLoading={isLoading}
          loadingText='Updating...'
        >
          Update
        </Button>
      </HStack>
    </SettingsCard>
  )
}
