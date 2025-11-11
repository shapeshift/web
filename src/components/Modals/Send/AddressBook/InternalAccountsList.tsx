import { Box, HStack, Icon, Text as CText, VStack } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { memo, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SendFormFields } from '../SendCommon'

import { InternalAccountButton } from '@/components/Modals/Send/AddressBook/InternalAccountButton'
import { Text } from '@/components/Text'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAccountIdsByChainIdFilter,
  selectAssetById,
  selectInternalAccountsBySearchQuery,
  selectPortfolioAccountMetadata,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type InternalAccountsListProps = {
  chainId?: ChainId
  onAccountClick: (address: string) => void
}

export const InternalAccountsList = memo(
  ({ chainId, onAccountClick }: InternalAccountsListProps) => {
    const translate = useTranslate()
    const {
      control,
      formState: { errors },
    } = useFormContext()
    const [loadingAccountId, setLoadingAccountId] = useState<AccountId | null>(null)

    const input = useWatch({
      control,
      name: SendFormFields.Input,
    }) as string

    const addressError = errors[SendFormFields.Input]?.message ?? null

    const assetId = useWatch({
      control,
      name: SendFormFields.AssetId,
    }) as string

    const accountMetadata = useAppSelector(selectPortfolioAccountMetadata)
    const asset = useAppSelector(state => selectAssetById(state, assetId))

    const chainFilter = useMemo(() => ({ chainId }), [chainId])
    const allAccountIds = useAppSelector(state =>
      selectAccountIdsByChainIdFilter(state, chainFilter),
    )

    const searchFilter = useMemo(() => ({ chainId, searchQuery: input }), [chainId, input])
    const searchAccountIds = useAppSelector(state =>
      selectInternalAccountsBySearchQuery(state, searchFilter),
    )

    const accountIds = !input || !addressError ? allAccountIds : searchAccountIds

    const internalAccounts = useMemo(() => {
      return accountIds
        .map(accountId => {
          const { account } = fromAccountId(accountId)
          const metadata = accountMetadata[accountId]
          const accountNumber = metadata?.bip44Params?.accountNumber

          const label =
            accountNumber !== undefined
              ? translate('accounts.accountNumber', { accountNumber })
              : translate('common.account')

          return {
            accountId,
            address: account,
            label,
            accountNumber,
            accountType: isUtxoAccountId(accountId) ? accountIdToLabel(accountId) : undefined,
          }
        })
        .sort((a, b) => a.accountNumber - b.accountNumber)
    }, [accountIds, accountMetadata, translate])

    const filteredAccounts = internalAccounts

    const accountButtons = useMemo(() => {
      if (filteredAccounts.length === 0 || !chainId)
        return (
          <Text translation='modals.send.noInternalAccounts' size='xs' mx={2} color='text.subtle' />
        )

      return filteredAccounts.map(account => {
        const entryKey = toAccountId({ chainId, account: account.address })

        return (
          <InternalAccountButton
            key={entryKey}
            accountId={account.accountId}
            label={account.label}
            address={account.address}
            chainId={chainId}
            entryKey={entryKey}
            onSelect={onAccountClick}
            asset={asset}
            isLoading={loadingAccountId === account.accountId}
            setLoadingAccountId={setLoadingAccountId}
            accountType={account.accountType}
          />
        )
      })
    }, [filteredAccounts, chainId, onAccountClick, asset, loadingAccountId])

    if (internalAccounts.length === 0) return null

    return (
      <Box mt={6}>
        <HStack spacing={2} mb={2}>
          <Icon as={FaWallet} boxSize={4} color='text.subtle' />
          <CText fontSize='sm' fontWeight='medium' color='text.subtle'>
            {translate('modals.send.yourWallets')}
          </CText>
        </HStack>

        <VStack spacing={3} align='stretch'>
          {accountButtons}
        </VStack>
      </Box>
    )
  },
)
