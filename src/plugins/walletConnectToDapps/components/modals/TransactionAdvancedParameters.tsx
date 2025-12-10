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
  Skeleton,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText, Text } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { ConfirmData } from '@/plugins/walletConnectToDapps/types'

type TransactionAdvancedParametersProps = {
  accountId: AccountId | undefined
  chainId: ChainId | undefined
}

export const TransactionAdvancedParameters = ({
  accountId,
  chainId,
}: TransactionAdvancedParametersProps) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const [isExpanded, setIsExpanded] = useState(false)
  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])
  const handleToggle = useCallback(() => setIsExpanded(!isExpanded), [isExpanded])

  const address = useMemo(() => {
    if (!accountId) return undefined
    return fromAccountId(accountId).account
  }, [accountId])

  const { data: currentNonce, isLoading: isLoadingNonce } = useQuery({
    queryKey: ['currentNonce', chainId, address],
    queryFn:
      chainId && address
        ? async () => {
            const chainAdapterManager = getChainAdapterManager()
            const adapter = chainAdapterManager.get(chainId) as EvmChainAdapter
            if (!adapter) throw new Error(`No adapter found for chainId: ${chainId}`)
            const account = await adapter.getAccount(address)
            return account.chainSpecific.nonce
          }
        : skipToken,
    // Always refetch on mount to get the latest nonce
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const formContext = useFormContext<ConfirmData>()
  const { register, setValue, watch } = formContext ?? {}

  const formNonce = watch?.('nonce')

  useEffect(() => {
    if (currentNonce !== undefined && !formNonce) {
      setValue?.('nonce', currentNonce.toString())
    }
  }, [currentNonce, formNonce, setValue])

  if (!formContext) return null

  return (
    <Card p={4} borderRadius='2xl' mt={4}>
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
                  fontSize='sm'
                  translation='plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.nonce.title'
                />
                <HelperTooltip
                  label={translate(
                    'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.nonce.tooltip',
                  )}
                />
              </FormLabel>
              <Skeleton isLoaded={!isLoadingNonce}>
                <NumberInput borderColor={borderColor} mt={2}>
                  <NumberInputField {...register('nonce')} />
                </NumberInput>
              </Skeleton>
            </FormControl>

            <FormControl>
              <FormLabel display='flex' columnGap={1}>
                <Text
                  color='text.subtle'
                  fontWeight='medium'
                  fontSize='sm'
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
