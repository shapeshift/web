import { ChevronDownIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, Menu, MenuButton, MenuItem, MenuList, VStack } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'

type GasSelectionMenuProps = {
  fees: Record<FeeDataKey, { txFee?: string; fiatFee: string }>
  feeAsset: Asset
  formMethods: UseFormReturn<CustomTransactionData>
}

export const GasSelectionMenu: FC<GasSelectionMenuProps> = ({ fees, feeAsset, formMethods }) => {
  const [selectedSpeed, setSelectedSpeed] = useState<FeeDataKey>(FeeDataKey.Fast)
  const translate = useTranslate()

  const handleSpeedChange = useCallback(
    (newSpeed: FeeDataKey) => {
      setSelectedSpeed(newSpeed)
      formMethods.setValue('speed', newSpeed)
    },
    [formMethods],
  )

  const speedOptions = useMemo(
    () => [
      { value: FeeDataKey.Slow, emoji: '🐌', text: 'Slow ~10 mins' },
      { value: FeeDataKey.Average, emoji: '🟡', text: 'Average ~3 mins' },
      { value: FeeDataKey.Fast, emoji: '⚡', text: 'Fast ~24 sec' },
    ],
    [],
  )

  const currentFee = useMemo(() => {
    if (!fees) return null
    return fees[selectedSpeed]
  }, [fees, selectedSpeed])

  const currentSpeedOption = useMemo(
    () => speedOptions.find(option => option.value === selectedSpeed) || speedOptions[2], // default to Fast
    [speedOptions, selectedSpeed],
  )

  const tooltipIconProps = useMemo(() => ({ boxSize: '12px', color: 'text.subtle' }), [])
  const chevronIcon = useMemo(() => <ChevronDownIcon />, [])
  const menuButtonHoverStyle = useMemo(() => ({ borderColor: 'whiteAlpha.300' }), [])
  const menuButtonActiveStyle = useMemo(() => ({ borderColor: 'whiteAlpha.400' }), [])
  const menuListStyles = useMemo(
    () => ({
      bg: 'gray.800',
      borderColor: 'whiteAlpha.200',
      borderRadius: 'lg',
      py: 1,
    }),
    [],
  )
  const menuItemHoverStyle = useMemo(() => ({ bg: 'whiteAlpha.100' }), [])
  const menuItemFocusStyle = useMemo(() => ({ bg: 'whiteAlpha.100' }), [])

  const createMenuItemClickHandler = useCallback(
    (speed: FeeDataKey) => () => handleSpeedChange(speed),
    [handleSpeedChange],
  )

  if (!currentFee) return null

  return (
    <HStack justify='space-between' w='full' align='center'>
      <VStack spacing={0} align='flex-start'>
        <RawText fontSize='sm' fontWeight='bold'>
          {currentFee.txFee &&
            bnOrZero(fromBaseUnit(currentFee.txFee, feeAsset.precision)).toFixed(6)}{' '}
          {feeAsset.symbol} (${bnOrZero(currentFee.fiatFee).toFixed(2)})
        </RawText>
        <HStack spacing={1} align='center'>
          <HelperTooltip
            label={translate(
              'plugins.walletConnectToDapps.modal.sendTransaction.feeEstimateTooltip',
            )}
            iconProps={tooltipIconProps}
          />
          <RawText fontSize='xs' color='text.subtle'>
            Fee Estimate
          </RawText>
        </HStack>
      </VStack>

      <Menu>
        <MenuButton
          as={Button}
          rightIcon={chevronIcon}
          size='sm'
          maxW='140px'
          variant='outline'
          bg='transparent'
          borderColor='whiteAlpha.200'
          borderWidth='1px'
          borderRadius='lg'
          color='white'
          fontSize='sm'
          fontWeight='medium'
          _hover={menuButtonHoverStyle}
          _active={menuButtonActiveStyle}
          px={3}
        >
          <HStack spacing={1}>
            <Box>{currentSpeedOption.emoji}</Box>
            <Box>{currentSpeedOption.text}</Box>
          </HStack>
        </MenuButton>
        <MenuList {...menuListStyles}>
          {speedOptions.map(option => (
            <MenuItem
              key={option.value}
              onClick={createMenuItemClickHandler(option.value)}
              bg='transparent'
              color='white'
              fontSize='sm'
              _hover={menuItemHoverStyle}
              _focus={menuItemFocusStyle}
              px={3}
              py={2}
            >
              <HStack spacing={2}>
                <Box>{option.emoji}</Box>
                <Box>{option.text}</Box>
              </HStack>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </HStack>
  )
}
