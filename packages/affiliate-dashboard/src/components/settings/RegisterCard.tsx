import { Button, Flex, Input, InputGroup, InputRightAddon, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import type { ActionMessage } from '../../hooks/useAffiliateActions'
import { DEFAULT_BPS, MAX_BPS, MIN_BPS } from '../../lib/constants'
import { bpsToPercent, parseBps, parsePartnerCode } from '../../lib/format'
import { SettingsCard } from './SettingsCard'

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
  const parsedCode = parsePartnerCode(partnerCode)

  const disabled = partnerCode === '' || bps === ''

  const handleClick = (): void => {
    if (parsedCode === null) {
      return onValidationError({
        type: 'error',
        text: `Partner code must be 3–32 lowercase letters or numbers (e.g. mypartnercode)`,
      })
    }
    if (parsedBps === null) {
      return onValidationError({
        type: 'error',
        text: `Affiliate BPS must be a number between ${MIN_BPS} and ${MAX_BPS}`,
      })
    }
    onRegister({ bps: parsedBps, partnerCode: parsedCode })
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
            placeholder='e.g. mypartnercode'
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
            />
            <InputRightAddon
              bg='bg.surface'
              borderColor='border.input'
              fontFamily='mono'
              fontSize='sm'
              color='fg.muted'
            >
              {bpsToPercent(Number(bps) ?? 0)}
            </InputRightAddon>
          </InputGroup>
        </Row>
      </Stack>
    </SettingsCard>
  )
}
