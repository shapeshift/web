import type { AlertProps } from '@chakra-ui/react'
import { Alert, AlertIcon } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { Text } from '@/components/Text'
import { useIsSmartContractAddress } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { selectInternalAccountIdByAddress } from '@/state/slices/addressBookSlice/selectors'
import { useAppSelector } from '@/state/store'

type ContractAddressWarningProps = {
  address: string | undefined
  chainId: ChainId | undefined
} & Omit<AlertProps, 'status'>

export const ContractAddressWarning = ({
  address,
  chainId,
  ...alertProps
}: ContractAddressWarningProps) => {
  const { data: isContractAddress } = useIsSmartContractAddress(
    chainId ? address ?? '' : '',
    chainId ?? ethChainId,
  )

  const internalAccountIdFilter = useMemo(
    () => ({ accountAddress: address, chainId }),
    [address, chainId],
  )
  const internalAccountId = useAppSelector(state =>
    selectInternalAccountIdByAddress(state, internalAccountIdFilter),
  )

  const shouldShowWarning = useMemo(
    () => Boolean(address && chainId && isContractAddress && !internalAccountId),
    [address, chainId, isContractAddress, internalAccountId],
  )

  if (!shouldShowWarning) return null

  return (
    <Alert status='warning' borderRadius='lg' {...alertProps}>
      <AlertIcon />
      <Text translation='modals.send.contractAddressWarning' fontSize='sm' />
    </Alert>
  )
}
