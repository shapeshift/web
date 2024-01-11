import type { RadioProps } from '@chakra-ui/react'
import { Box, Flex, HStack, useRadio, useRadioGroup } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import React, { useMemo } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { AssetSymbol } from 'components/AssetSymbol'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { RawText } from 'components/Text'

import { PoolIcon } from '../../PoolIcon'

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
        borderRadius='lg'
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
    value: 'one',
    assetIds: [ethAssetId],
  },
  {
    value: 'two',
    assetIds: [ethAssetId, usdcAssetId],
  },
  {
    value: 'three',
    assetIds: [usdcAssetId],
  },
]

export const DepositType = () => {
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'depositType',
    defaultValue: 'one',
    onChange: console.log,
  })
  const group = getRootProps()
  return (
    <Flex px={4} gap={4} {...group}>
      {options.map((value, index) => {
        const radio = getRadioProps({ value: value.value })
        return (
          <TypeRadio key={`type-${index}`} {...radio}>
            <PoolIcon assetIds={value.assetIds} size='xs' />
            <Flex mt={4} fontSize='sm' justifyContent='space-between' alignItems='center'>
              <TypeLabel assetIds={value.assetIds} />
              {value.assetIds.length === 1 && (
                <Box as='span' color='text.subtlest' fontSize='md' className='asym-icon'>
                  <BiSolidBoltCircle />
                </Box>
              )}
            </Flex>
          </TypeRadio>
        )
      })}
    </Flex>
  )
}
