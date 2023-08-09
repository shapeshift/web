import {
  Alert,
  AlertIcon,
  Card,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'

export const TransactionAdvancedParameters = () => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const formContext = useFormContext<ConfirmData>()
  const bgColor = useColorModeValue('white', 'gray.850')
  if (!formContext) return null
  const { register } = formContext

  return (
    <Card bg={bgColor} p={4} borderRadius='md'>
      <VStack alignItems='stretch'>
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
    </Card>
  )
}
