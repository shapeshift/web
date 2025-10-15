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
  VStack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const SPEED_OPTIONS = [
  { value: FeeDataKey.Slow, emoji: '🐌', text: 'Slow' },
  { value: FeeDataKey.Average, emoji: '🟡', text: 'Average' },
  { value: FeeDataKey.Fast, emoji: '⚡', text: 'Fast' },
]

const tooltipIconSx = { boxSize: '12px', color: 'text.subtle' }
const chevronIcon = <ChevronDownIcon />

export type GasSelectionProps = {
  selectedSpeed: FeeDataKey
  onSpeedChange: (speed: FeeDataKey) => void
  amountCryptoPrecision: string
  feeAssetId: AssetId | undefined
  fiatFee: string
  isLoading: boolean
}

export const GasSelection: FC<GasSelectionProps> = ({
  selectedSpeed,
  onSpeedChange,
  amountCryptoPrecision,
  feeAssetId,
  fiatFee,
  isLoading = false,
}) => {
  const translate = useTranslate()
  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const handleSpeedChange = useCallback(
    (newSpeed: FeeDataKey) => {
      onSpeedChange(newSpeed)
    },
    [onSpeedChange],
  )

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  const currentSpeedOption = useMemo(
    () => SPEED_OPTIONS.find(option => option.value === selectedSpeed),
    [selectedSpeed],
  )

  const createMenuItemClickHandler = useCallback(
    (speed: FeeDataKey) => () => handleSpeedChange(speed),
    [handleSpeedChange],
  )

  const fiatFeeFormatted = useMemo(() => {
    return toFiat(fiatFee)
  }, [fiatFee, toFiat])

  if (isLoading) {
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

  return (
    <HStack justify='space-between' w='full' align='center'>
      <VStack spacing={0} align='flex-start'>
        <Amount.Crypto
          value={amountCryptoPrecision}
          symbol={feeAsset?.symbol ?? ''}
          fontSize='sm'
          fontWeight='medium'
          suffix={` (${fiatFeeFormatted})`}
          maximumFractionDigits={30}
        />
        <HStack spacing={1} align='center'>
          <HelperTooltip label={translate('common.feeEstimate')} iconProps={tooltipIconSx} />
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
          fontSize='sm'
          fontWeight='medium'
          px={3}
        >
          <HStack spacing={1}>
            <Box>{currentSpeedOption?.emoji}</Box>
            <Box>{currentSpeedOption?.text}</Box>
          </HStack>
        </MenuButton>
        <MenuList>
          {SPEED_OPTIONS.map(option => (
            <MenuItem
              m={0}
              px={4}
              key={option.value}
              onClick={createMenuItemClickHandler(option.value)}
              w='100%'
              borderRadius='0'
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
