import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { HStack, IconButton, Text, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

type Props = {
  value: number
  max: number
  onChange(value: number): void
}

const styleProp = { height: 36 }
const arrowBackIcon = <ArrowBackIcon />
const arrowForwardIcon = <ArrowForwardIcon />

export const PageInput: FC<Props> = ({ value, max, onChange }) => {
  const translate = useTranslate()
  const nextPage = useCallback(() => onChange(value + 1), [onChange, value])
  const prevPage = useCallback(() => onChange(value - 1), [onChange, value])

  return (
    <HStack
      align='center'
      borderWidth={2}
      borderRadius='md'
      justifyContent='space-between'
      borderColor={useColorModeValue('blackAlpha.50', 'gray.750')}
    >
      <IconButton
        colorScheme='gray'
        aria-label={translate('plugins.walletConnectToDapps.registry.pageInput.prevPage')}
        variant='ghost'
        icon={arrowBackIcon}
        disabled={value <= 0}
        style={styleProp}
        onClick={prevPage}
      />
      <Text textAlign='center' minWidth={16}>
        {translate('plugins.walletConnectToDapps.registry.pageInput.label', {
          current: value + 1,
          total: max + 1,
        })}
      </Text>
      <IconButton
        aria-label={translate('plugins.walletConnectToDapps.registry.pageInput.nextPage')}
        variant='ghost'
        icon={arrowForwardIcon}
        disabled={value >= max}
        style={styleProp}
        onClick={nextPage}
      />
    </HStack>
  )
}
