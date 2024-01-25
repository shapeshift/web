import type { RadioProps } from '@chakra-ui/react'
import { Box, Flex, HStack, useRadio, useRadioGroup } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import React, { useCallback, useMemo } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText } from 'components/Text'
import { AsymSide } from 'lib/utils/thorchain/lp/types'

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
    value: AsymSide.Rune,
  },
  {
    value: null,
  },
]

type DepositTypeProps = {
  assetId: AssetId
  onAsymSideChange: (asymSide: string | null) => void
  defaultOpportunityId?: string
}
export const LpType = ({ assetId, defaultOpportunityId, onAsymSideChange }: DepositTypeProps) => {
  const assetIds = useMemo(() => {
    return [assetId, thorchainAssetId]
  }, [assetId])

  const makeAssetIdsOption = useCallback(
    (value: AsymSide | null): AssetId[] => {
      if (value === null) return assetIds
      if (value === AsymSide.Rune) return [thorchainAssetId]
      if (value === AsymSide.Asset) return [assetId]

      throw new Error(`Invalid value ${value}`)
    },
    [assetId, assetIds],
  )

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'depositType',
    defaultValue: 'one',
    onChange: onAsymSideChange,
  })

  const radioOptions = useMemo(() => {
    const _options = defaultOpportunityId ? options : []

    return _options.map((option, index) => {
      const radio = getRadioProps({ value: option.value })

      const optionAssetIds = makeAssetIdsOption(option.value)
      return (
        <TypeRadio key={`type-${index}`} {...radio}>
          <PoolIcon assetIds={optionAssetIds} size='xs' />
          <Flex mt={4} fontSize='sm' justifyContent='space-between' alignItems='center'>
            <TypeLabel assetIds={optionAssetIds} />
            {optionAssetIds.length === 1 && (
              <Box as='span' color='text.subtlest' fontSize='md' className='asym-icon'>
                <BiSolidBoltCircle />
              </Box>
            )}
          </Flex>
        </TypeRadio>
      )
    })
  }, [defaultOpportunityId, getRadioProps, makeAssetIdsOption])

  const group = getRootProps()
  return (
    <Flex px={4} gap={2} {...group}>
      {radioOptions}
    </Flex>
  )
}
