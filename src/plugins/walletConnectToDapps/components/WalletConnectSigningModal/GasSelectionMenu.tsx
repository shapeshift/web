import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'
import { useSimulateEvmTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'

type GasSelectionMenuProps = {
  transaction: TransactionParams
  chainId: ChainId
}

const SPEED_OPTIONS = [
  { value: FeeDataKey.Slow, emoji: '🐌', text: 'Slow' },
  { value: FeeDataKey.Average, emoji: '🟡', text: 'Average' },
  { value: FeeDataKey.Fast, emoji: '⚡', text: 'Fast' },
]

const tooltipIconSx = { boxSize: '12px', color: 'text.subtle' }
const chevronIcon = <ChevronDownIcon />

export const GasSelectionMenu: FC<GasSelectionMenuProps> = ({ transaction, chainId }) => {
  const translate = useTranslate()
  const { setValue } = useFormContext<CustomTransactionData>()

  const menuButtonBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200')
  const menuButtonHoverBorderColor = useColorModeValue('gray.300', 'whiteAlpha.300')
  const menuButtonActiveBorderColor = useColorModeValue('gray.400', 'whiteAlpha.400')
  const menuListBg = useColorModeValue('white', 'gray.800')
  const menuListBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200')
  const buttonTextColor = useColorModeValue('gray.800', 'white')

  const menuButtonHoverSx = useMemo(
    () => ({ borderColor: menuButtonHoverBorderColor }),
    [menuButtonHoverBorderColor],
  )
  const menuButtonActiveSx = useMemo(
    () => ({ borderColor: menuButtonActiveBorderColor }),
    [menuButtonActiveBorderColor],
  )
  const menuListSx = {
    bg: menuListBg,
    borderColor: menuListBorderColor,
    borderRadius: 'lg',
    py: 1,
    px: 0,
    minW: 'auto',
    w: 'auto',
  }

  const { speed } = useWatch<CustomTransactionData>()
  const selectedSpeed = speed

  const { simulationQuery, gasFeeDataQuery, fee } = useSimulateEvmTransaction({
    transaction,
    chainId,
    speed: selectedSpeed,
  })

  const handleSpeedChange = useCallback(
    (newSpeed: FeeDataKey) => {
      setValue('speed', newSpeed)
    },
    [setValue],
  )

  const currentSpeedOption = useMemo(
    () => SPEED_OPTIONS.find(option => option.value === selectedSpeed),
    [selectedSpeed],
  )

  const createMenuItemClickHandler = useCallback(
    (speed: FeeDataKey) => () => handleSpeedChange(speed),
    [handleSpeedChange],
  )

  if (!fee?.feeAsset) return null

  if (gasFeeDataQuery.isLoading || simulationQuery.isLoading) {
    return (
      <HStack justify='space-between' w='full' align='center'>
        <VStack spacing={0} align='flex-start'>
          <Skeleton height='20px' width='120px' />
          <HStack spacing={1} align='center'>
            <HelperTooltip
              label={translate('modals.status.estimatedGas')}
              iconProps={tooltipIconSx}
            />
            <RawText fontSize='xs' color='text.subtle'>
              {translate('common.feeEstimate')}
            </RawText>
          </HStack>
        </VStack>
        <Skeleton height='32px' width='100px' />
      </HStack>
    )
  }

  if (!fee) return null

  return (
    <HStack justify='space-between' w='full' align='center'>
      <VStack spacing={0} align='flex-start'>
        <RawText fontSize='sm' fontWeight='bold'>
          {fee.txFeeCryptoPrecision} {fee.feeAsset.symbol} (${fee.fiatFee})
        </RawText>
        <HStack spacing={1} align='center'>
          <HelperTooltip
            label={translate('modals.status.estimatedGas')}
            iconProps={tooltipIconSx}
          />
          <RawText fontSize='xs' color='text.subtle'>
            {translate('common.feeEstimate')}
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
          borderColor={menuButtonBorderColor}
          borderWidth='1px'
          borderRadius='lg'
          color={buttonTextColor}
          fontSize='sm'
          fontWeight='medium'
          _hover={menuButtonHoverSx}
          _active={menuButtonActiveSx}
          px={3}
        >
          <HStack spacing={1}>
            <Box>{currentSpeedOption?.emoji}</Box>
            <Box>{currentSpeedOption?.text}</Box>
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
