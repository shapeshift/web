import type { RadioProps } from '@chakra-ui/react'
import { Box, Flex, HStack, Tooltip, useRadio, useRadioGroup } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import React, { useCallback, useEffect, useMemo } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { useTranslate } from 'react-polyglot'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText } from 'components/Text'
import { assertUnreachable } from 'lib/utils'
import { AsymSide } from 'lib/utils/thorchain/lp/types'

import { fromOpportunityId } from '../utils'
import { PoolIcon } from './PoolIcon'

const checked = {
  bg: 'background.surface.raised.pressed',
  borderColor: 'border.focused',
  '.asym-icon': {
    color: 'text.info',
  },
}
const hover = {
  borderColor: 'border.hover',
}

const disabled = {
  opacity: 0.4,
  cursor: 'not-allowed',
}

const TypeLabel: React.FC<{ assetIds: AssetId[] }> = ({ assetIds }) => {
  const divider = useMemo(() => <RawText>+</RawText>, [])
  const labels = useMemo(() => {
    return assetIds.map(assetId => {
      return <AssetSymbol key={assetId} assetId={assetId} />
    })
  }, [assetIds])
  return (
    <HStack divider={divider} fontWeight='medium' fontSize='xs'>
      {labels}
    </HStack>
  )
}

const TypeRadio: React.FC<RadioProps> = props => {
  const { getInputProps, getRadioProps } = useRadio(props)
  const input = getInputProps()
  const checkbox = getRadioProps()
  return (
    <Box flex={1} cursor='pointer' as='label'>
      <input {...input} />
      <Box
        bg='background.surface.raised.base'
        borderRadius='xl'
        width='full'
        borderWidth={2}
        borderColor='transparent'
        p={4}
        transitionProperty='common'
        transitionDuration='normal'
        _hover={hover}
        _checked={checked}
        _disabled={disabled}
        {...checkbox}
      >
        {props.children}
      </Box>
    </Box>
  )
}

const options = [
  {
    value: AsymSide.Asset,
  },
  {
    value: 'sym',
  },
  {
    value: AsymSide.Rune,
  },
]

type DepositTypeProps = {
  assetId: AssetId
  onAsymSideChange: (asymSide: string | null) => void
  opportunityId?: string
  side?: AsymSide | 'sym'
}

export const LpType = ({ assetId, opportunityId, side, onAsymSideChange }: DepositTypeProps) => {
  const translate = useTranslate()

  const makeAssetIdsOption = useCallback(
    (value: AsymSide | 'sym'): AssetId[] => {
      switch (value) {
        case AsymSide.Rune:
          return [thorchainAssetId]
        case AsymSide.Asset:
          return [assetId]
        case 'sym':
          return [assetId, thorchainAssetId]
        default:
          assertUnreachable(value)
      }
    },
    [assetId],
  )

  const opportunityType = opportunityId ? fromOpportunityId(opportunityId).type : side
  const defaultSide = opportunityType ?? side

  const { getRootProps, getRadioProps, setValue } = useRadioGroup({
    name: 'depositType',
    defaultValue: defaultSide,
    onChange: onAsymSideChange,
  })

  useEffect(() => {
    if (!opportunityId) return
    setValue(fromOpportunityId(opportunityId).type)
  }, [opportunityId, setValue])

  const radioOptions = useMemo(() => {
    return options.map((option, index) => {
      const radio = getRadioProps({ value: option.value })
      const optionAssetIds = makeAssetIdsOption(option.value as AsymSide | 'sym')

      const isDisabled = !!side && opportunityType !== 'sym' && option.value === 'sym'

      return (
        <TypeRadio {...radio} isDisabled={isDisabled}>
          <Tooltip
            key={`type-${index}`}
            isDisabled={!isDisabled}
            label={translate('pools.symWithdrawOnAsymPositionAlert')}
          >
            <Box>
              <PoolIcon assetIds={optionAssetIds} size='xs' />
              <Flex mt={4} fontSize='sm' justifyContent='space-between' alignItems='center'>
                <TypeLabel assetIds={optionAssetIds} />
                {optionAssetIds.length === 1 && (
                  <Box as='span' color='text.subtlest' fontSize='md' className='asym-icon'>
                    <BiSolidBoltCircle />
                  </Box>
                )}
              </Flex>
            </Box>
          </Tooltip>
        </TypeRadio>
      )
    })
  }, [getRadioProps, makeAssetIdsOption, side, opportunityType, translate])

  const group = getRootProps()
  return (
    <Flex px={4} gap={2} {...group}>
      {radioOptions}
    </Flex>
  )
}
