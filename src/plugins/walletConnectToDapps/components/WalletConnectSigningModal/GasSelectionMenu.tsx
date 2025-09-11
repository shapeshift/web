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

const SPEED_OPTIONS = [
  { value: FeeDataKey.Slow, emoji: '🐌', text: 'Slow ~10 mins' },
  { value: FeeDataKey.Average, emoji: '🟡', text: 'Average ~3 mins' },
  { value: FeeDataKey.Fast, emoji: '⚡', text: 'Fast ~24 sec' },
]

const tooltipIconSx = { boxSize: '12px', color: 'text.subtle' }
const menuButtonHoverSx = { borderColor: 'whiteAlpha.300' }
const menuButtonActiveSx = { borderColor: 'whiteAlpha.400' }
const menuListSx = {
  bg: 'gray.800',
  borderColor: 'whiteAlpha.200',
  borderRadius: 'lg',
  py: 1,
  px: 0,
  minW: 'auto',
  w: 'auto',
}
const chevronIcon = <ChevronDownIcon />

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

  const selectedFee = useMemo(() => {
    if (!fees) return null
    return fees[selectedSpeed]
  }, [fees, selectedSpeed])

  const currentSpeedOption = useMemo(
    () => SPEED_OPTIONS.find(option => option.value === selectedSpeed) || SPEED_OPTIONS[2],
    [selectedSpeed],
  )

  const createMenuItemClickHandler = useCallback(
    (speed: FeeDataKey) => () => handleSpeedChange(speed),
    [handleSpeedChange],
  )

  const networkFeeCryptoPrecision = useMemo(() => {
    if (!selectedFee?.txFee) return '0'
    return bnOrZero(fromBaseUnit(selectedFee.txFee, feeAsset.precision)).toFixed(6)
  }, [selectedFee?.txFee, feeAsset.precision])

  if (!selectedFee) return null

  return (
    <HStack justify='space-between' w='full' align='center'>
      <VStack spacing={0} align='flex-start'>
        <RawText fontSize='sm' fontWeight='bold'>
          {networkFeeCryptoPrecision} {feeAsset.symbol} (${bnOrZero(selectedFee.fiatFee).toFixed(2)}
          )
        </RawText>
        <HStack spacing={1} align='center'>
          <HelperTooltip
            label={translate(
              'plugins.walletConnectToDapps.modal.sendTransaction.feeEstimateTooltip',
            )}
            iconProps={tooltipIconSx}
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
          _hover={menuButtonHoverSx}
          _active={menuButtonActiveSx}
          px={3}
        >
          <HStack spacing={1}>
            <Box>{currentSpeedOption.emoji}</Box>
            <Box>{currentSpeedOption.text}</Box>
          </HStack>
        </MenuButton>
        <MenuList {...menuListSx}>
          {SPEED_OPTIONS.map(option => (
            <MenuItem
              key={option.value}
              onClick={createMenuItemClickHandler(option.value)}
              w='100%'
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
