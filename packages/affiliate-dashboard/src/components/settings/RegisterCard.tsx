import { Button, Flex, Input, InputGroup, InputRightAddon, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import type { ActionMessage } from '../../hooks/useAffiliateActions'
import { DEFAULT_BPS, MAX_BPS, MIN_BPS } from '../../lib/constants'
import { bpsToPercent, parseBps } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

const PARTNER_CODE_REGEX = /^[a-zA-Z0-9-]{3,32}$/

interface RegisterCardProps {
  address: string
  isLoading: boolean
  onRegister: (args: { bps: number; partnerCode: string }) => void
  onValidationError: (message: ActionMessage) => void
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
  onValidationError,
}: RegisterCardProps): React.JSX.Element => {
  const [bps, setBps] = useState(String(DEFAULT_BPS))
  const [partnerCode, setPartnerCode] = useState('')
  const parsedBps = parseBps(bps)
  const trimmedCode = partnerCode.trim()

  const codeIsValid = PARTNER_CODE_REGEX.test(trimmedCode)
  const bpsIsValid = parsedBps !== null

  const disabled = !codeIsValid || !bpsIsValid

  const handleClick = (): void => {
    if (!codeIsValid) {
      onValidationError({
        type: 'error',
        text: 'Partner code must be 3–32 alphanumeric characters or hyphens',
      })
      return
    }
    if (parsedBps === null) {
      onValidationError({
        type: 'error',
        text: `BPS must be a number between ${MIN_BPS} and ${MAX_BPS}`,
      })
      return
    }
    onRegister({ bps: parsedBps, partnerCode: trimmedCode })
  }

  return (
    <SettingsCard
      title='Affiliate Registration'
      description='Earn swap fees whenever a user trades through your partner code.'
      headerRight={
        <Button
          onClick={handleClick}
          isDisabled={disabled}
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
        <Row label='Partner Code'>
          <Input
            value={partnerCode}
            onChange={e => setPartnerCode(e.target.value)}
            placeholder='e.g. mypartner'
            spellCheck={false}
            w='20ch'
          />
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
