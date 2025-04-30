import { Button, FormControl, FormHelperText, FormLabel, HStack, Input } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { InlineCopyButton } from '@/components/InlineCopyButton'

const boxProps = {
  width: 'full',
  p: 0,
  m: 0,
}
const buttonProps = {
  width: 'full',
  variant: 'solid',
  height: '40px',
  px: 4,
}

export const ClaimAddressInput = () => {
  const [runeAddress, setRuneAddress] = useState<string | undefined>()
  const [isCustomAddress, setIsCustomAddress] = useState(false)

  const handleRuneAddressChange = useCallback((address?: string) => {
    setRuneAddress(address)
  }, [])

  const handleRuneInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRuneAddress(e.target.value)
  }, [])

  const handleToggleCustomAddress = useCallback(() => {
    setIsCustomAddress(!isCustomAddress)
  }, [isCustomAddress])

  const renderInputSelection = useMemo(() => {
    if (isCustomAddress) {
      return <Input autoFocus value={runeAddress} onChange={handleRuneInputChange} />
    }

    return (
      <InlineCopyButton value={runeAddress ?? ''}>
        <AccountDropdown
          assetId={ethAssetId}
          onChange={handleRuneAddressChange}
          boxProps={boxProps}
          buttonProps={buttonProps}
        />
      </InlineCopyButton>
    )
  }, [isCustomAddress, runeAddress, handleRuneInputChange, handleRuneAddressChange])

  return (
    <FormControl>
      <HStack justifyContent='space-between' mb={4}>
        <FormLabel mb={0}>Claim Address</FormLabel>
        <Button variant='link' color='text.link' onClick={handleToggleCustomAddress}>
          {isCustomAddress ? 'Use wallet address' : 'Use custom address'}
        </Button>
      </HStack>
      {renderInputSelection}
      <FormHelperText>This is where your TCY will be sent.</FormHelperText>
    </FormControl>
  )
}
