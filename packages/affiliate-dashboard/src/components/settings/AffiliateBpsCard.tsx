import { Button, HStack, Input, InputGroup, InputRightAddon } from '@chakra-ui/react'
import { useState } from 'react'

import type { ActionMessage } from '../../hooks/useAffiliateActions'
import { MAX_BPS, MIN_BPS } from '../../lib/constants'
import { bpsToPercent, parseBps } from '../../lib/format'
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
  const parsed = parseBps(value)
  const displayBps = value ? parsed ?? 0 : currentBps

  const handleUpdate = async (): Promise<void> => {
    if (parsed === null) {
      onValidationError({
        type: 'error',
        text: `BPS must be a number between ${MIN_BPS} and ${MAX_BPS}`,
      })
      return
    }
    try {
      await onUpdate(parsed)
      setValue('')
    } catch {
      // error surfaced via useAffiliateActions.onError; preserve input for retry
    }
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
            {bpsToPercent(displayBps)}
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
