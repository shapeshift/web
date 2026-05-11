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
import type { ChainId } from '@shapeshiftoss/caip'
import { bnOrZero, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
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

// 1.5x headroom on simulated gas to cover state drift between sim and broadcast.
// Matches the defaults used by MetaMask / Rabby / Frame.
const GAS_LIMIT_BUFFER_MULTIPLIER = 1.5

const tooltipIconSx = { boxSize: '12px', color: 'text.subtle' }
const chevronIcon = <ChevronDownIcon />

export const GasSelectionMenu: FC<GasSelectionMenuProps> = ({ transaction, chainId }) => {
  const translate = useTranslate()
  const { setValue } = useFormContext<CustomTransactionData>()

  const { speed } = useWatch<CustomTransactionData>()
  const { gasLimit } = useWatch<CustomTransactionData>()
  const selectedSpeed = speed

  const { gasEstimateQuery, fee } = useSimulateEvmTransaction({
    transaction,
    chainId,
    speed: selectedSpeed,
  })

  useEffect(() => {
    // Defer to the dApp / user value when one is already set; Tenderly only fills the gap.
    if (gasLimit) return

    const maybeGasUsed = gasEstimateQuery.data?.simulation?.transaction?.gas_used
    if (!maybeGasUsed) return

    const bufferedGas = bnOrZero(maybeGasUsed)
      .times(GAS_LIMIT_BUFFER_MULTIPLIER)
      .integerValue(BigNumber.ROUND_CEIL)

    setValue('gasLimit', bufferedGas.toString())
  }, [gasEstimateQuery.data?.simulation?.transaction?.gas_used, setValue, gasLimit])

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

  const isLoading = !fee

  return (
    <HStack justify='space-between' w='full' align='center'>
      <VStack spacing={0} align='flex-start'>
        {isLoading ? (
          <Skeleton height='20px' width='180px' />
        ) : (
          <RawText fontSize='sm' fontWeight='medium'>
            {fee.txFeeCryptoPrecision} {fee.feeAsset.symbol} (${fee.fiatFee})
          </RawText>
        )}
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
