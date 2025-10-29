import { Avatar, Box, HStack, Spinner, Text as CText, VStack } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { SendFormFields } from '../SendCommon'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useInternalAccountReceiveAddress } from '@/components/Modals/Send/AddressBook/hooks/useInternalAccountReceiveAddress'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'

type InternalAccountButtonProps = {
  accountId: AccountId
  label: string
  address: string
  chainId: ChainId
  entryKey: string
  onSelect: (address: string) => void
  asset: Asset | undefined
  isLoading: boolean
  setLoadingAccountId: (accountId: AccountId | null) => void
  accountType?: string
}

const addressSx = {
  _hover: {
    background: 'background.surface.raised.base',
  },
}

const InternalAccountButtonComponent = ({
  accountId,
  label,
  address,
  chainId,
  onSelect,
  asset,
  isLoading,
  setLoadingAccountId,
  accountType,
}: InternalAccountButtonProps) => {
  const chainNamespace = useMemo(() => fromChainId(chainId).chainNamespace, [chainId])

  const isUtxoAccount = useMemo(
    () => chainNamespace === CHAIN_NAMESPACE.Utxo && isUtxoAccountId(accountId),
    [accountId, chainNamespace],
  )

  const displayValue = useMemo(() => {
    if (isUtxoAccount && accountType) return accountType
    return address
  }, [isUtxoAccount, accountType, address])

  const avatarUrl = useMemo(() => {
    if (isUtxoAccount) return undefined
    return makeBlockiesUrl(address)
  }, [isUtxoAccount, address])

  const { setValue } = useFormContext()

  const { receiveAddress } = useInternalAccountReceiveAddress({
    accountId: isLoading ? accountId : null,
    asset,
    enabled: isLoading && isUtxoAccount,
  })

  useEffect(() => {
    if (receiveAddress && isLoading && isUtxoAccount) {
      setValue(SendFormFields.Input, receiveAddress, { shouldValidate: true })
      setLoadingAccountId(null)
      onSelect(receiveAddress)
    }
  }, [receiveAddress, isLoading, isUtxoAccount, setValue, setLoadingAccountId, onSelect])

  const handleClick = useCallback(() => {
    if (isUtxoAccount) {
      setLoadingAccountId(accountId)
    } else {
      onSelect(address)
    }
  }, [isUtxoAccount, accountId, address, onSelect, setLoadingAccountId])

  return (
    <Box
      cursor='pointer'
      alignItems='center'
      justifyContent='space-between'
      display='flex'
      overflow='hidden'
      width='full'
    >
      <HStack
        px={2}
        py={1}
        borderRadius='lg'
        spacing={3}
        align='center'
        flex={1}
        minWidth={0}
        onClick={handleClick}
        transition='all 0.2s'
        sx={addressSx}
      >
        {isUtxoAccount ? (
          <ProfileAvatar size='sm' flexShrink={0} />
        ) : (
          <Avatar src={avatarUrl} size='sm' flexShrink={0} />
        )}
        <VStack align='start' spacing={0} flex={1} minWidth={0}>
          <CText fontSize='md' fontWeight='semibold' color='text.primary' lineHeight={1}>
            {label}
          </CText>
          {isUtxoAccount ? (
            <CText fontSize='sm' color='text.subtle' noOfLines={1}>
              {displayValue}
            </CText>
          ) : (
            <MiddleEllipsis fontSize='sm' color='text.subtle' noOfLines={1} value={displayValue} />
          )}
        </VStack>
        {isLoading && <Spinner size='sm' color='blue.500' />}
      </HStack>
    </Box>
  )
}

export const InternalAccountButton = memo(InternalAccountButtonComponent)
