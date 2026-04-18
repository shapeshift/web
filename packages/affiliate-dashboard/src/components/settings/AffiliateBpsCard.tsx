import { Button, HStack, Input, InputGroup, InputRightAddon } from '@chakra-ui/react'
import { useState } from 'react'

import type { ActionMessage } from '../../hooks/useAffiliateActions'
import { SettingsCard } from './SettingsCard'

interface AffiliateBpsCardProps {
  currentBps: number
  isLoading: boolean
  onUpdate: (bps: number) => Promise<void>
  onValidationError: (message: ActionMessage) => void
}

export const AffiliateBpsCard = ({
  currentBps,
  isLoading,
  onUpdate,
  onValidationError,
}: AffiliateBpsCardProps): React.JSX.Element => {
  const [value, setValue] = useState('')
  const disabled = !value.trim()
  const displayBps = value ? parseInt(value, 10) || 0 : currentBps
  const percent = (displayBps / 100).toFixed(2)

  const handleUpdate = async (): Promise<void> => {
    const parsed = parseInt(value, 10)
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1000) {
      onValidationError({ type: 'error', text: 'BPS must be a number between 0 and 1000' })
      return
    }
    await onUpdate(parsed)
    setValue('')
  }

  return (
    <SettingsCard
      title='Affiliate BPS'
      description='Update your affiliate fee in basis points (BPS).'
    >
      <HStack spacing={3} wrap='wrap'>
        <InputGroup maxW='220px'>
          <Input
            type='number'
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={String(currentBps)}
            min={0}
            max={1000}
          />
          <InputRightAddon
            bg='bg.surface'
            borderColor='border.input'
            fontFamily='mono'
            fontSize='sm'
            color='fg.muted'
          >
            {percent}%
          </InputRightAddon>
        </InputGroup>
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
