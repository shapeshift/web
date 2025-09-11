import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Button,
  Card,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText, Text } from '@/components/Text'
import type { ConfirmData } from '@/plugins/walletConnectToDapps/types'

export const TransactionAdvancedParameters = () => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const [isExpanded, setIsExpanded] = useState(false)
  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])
  const handleToggle = useCallback(() => setIsExpanded(!isExpanded), [isExpanded])

  const formContext = useFormContext<ConfirmData>()
  const bgColor = useColorModeValue('white', 'whiteAlpha.50')
  if (!formContext) return null
  const { register } = formContext

  return (
    <Card bg={bgColor} p={4} borderRadius='2xl' mt={4}>
      <VStack alignItems='stretch'>
        <Button
          variant='ghost'
          size='sm'
          p={0}
          h='auto'
          fontWeight='medium'
          justifyContent='space-between'
          onClick={handleToggle}
          _hover={hoverStyle}
          w='full'
          mb={isExpanded ? 3 : 0}
        >
          <RawText fontSize='sm' fontWeight='bold' color='text.base'>
            {translate(
              'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
            )}
          </RawText>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>

        {isExpanded && (
          <VStack spacing={3} alignItems='stretch'>
            <Alert status='warning' variant='subtle' py={1} px={2} fontSize='sm'>
              <AlertIcon />
              <Text
                color='orange.200'
                translation='plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.alert'
              />
            </Alert>

            <FormControl>
              <FormLabel display='flex' columnGap={1}>
                <Text
                  color='text.subtle'
                  fontWeight='medium'
                  translation='plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.nonce.title'
                />
                <HelperTooltip
                  label={translate(
                    'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.nonce.tooltip',
                  )}
                />
              </FormLabel>
              <NumberInput borderColor={borderColor} mt={2}>
                <NumberInputField
                  placeholder={translate(
                    'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.nonce.placeholder',
                  )}
                  {...register('nonce')}
                />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel display='flex' columnGap={1}>
                <Text
                  color='text.subtle'
                  fontWeight='medium'
                  translation='plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.gasLimit.title'
                />
                <HelperTooltip
                  label={translate(
                    'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.gasLimit.tooltip',
                  )}
                />
              </FormLabel>
              <NumberInput borderColor={borderColor} mt={2}>
                <NumberInputField
                  placeholder={translate(
                    'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.gasLimit.placeholder',
                  )}
                  {...register('gasLimit')}
                />
              </NumberInput>
            </FormControl>
          </VStack>
        )}
      </VStack>
    </Card>
  )
}
