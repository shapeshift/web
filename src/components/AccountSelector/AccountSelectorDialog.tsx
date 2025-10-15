import { Box, Button, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import sortBy from 'lodash/sortBy'
import type { Asset } from 'packages/types/src/base'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'

import type { AccountIdsByNumberAndType } from '@/components/AccountDropdown/types'
import { utxoAccountTypeToDisplayPriority } from '@/components/AccountDropdown/utils'
import { AccountSelectorOption } from '@/components/AccountSelector/AccountSelectorOption'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectPortfolioAccountBalancesBaseUnit } from '@/state/slices/common-selectors'
import { selectPortfolioAccountMetadata } from '@/state/slices/selectors'

export const AccountSelectionDialog = ({
  isOpen,
  onClose,
  accountIdsByNumberAndType,
  asset,
  autoSelectHighestBalance,
  disabled,
  selectedAccountId,
  onAccountSelect,
}: {
  isOpen: boolean
  onClose: () => void
  accountIdsByNumberAndType: AccountIdsByNumberAndType
  asset: Asset
  autoSelectHighestBalance: boolean | undefined
  disabled: boolean | undefined
  selectedAccountId: AccountId | undefined
  onAccountSelect: (accountId: AccountId) => void
}) => {
  const { assetId } = asset
  const translate = useTranslate()
  const accountBalances = useSelector(selectPortfolioAccountBalancesBaseUnit)
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  const getAccountIdsSortedByUtxoAccountType = useCallback(
    (accountIds: AccountId[]): AccountId[] => {
      return sortBy(accountIds, accountId =>
        utxoAccountTypeToDisplayPriority(accountMetadata[accountId]?.accountType),
      )
    },
    [accountMetadata],
  )

  const getAccountIdsSortedByBalance = useCallback(
    (accountIds: AccountId[]): AccountId[] =>
      sortBy(
        accountIds,
        accountId => -bnOrZero(accountBalances?.[accountId]?.[assetId] ?? 0).toNumber(),
      ),
    [accountBalances, assetId],
  )

  const accountRows = useMemo(() => {
    return Object.entries(accountIdsByNumberAndType).map(([accountNumber, accountIds]) => {
      const sortedAccountIds = autoSelectHighestBalance
        ? getAccountIdsSortedByBalance(accountIds)
        : getAccountIdsSortedByUtxoAccountType(accountIds)

      if (accountIds.length === 0) return null

      return (
        <Box key={accountNumber}>
          <VStack spacing={2} align='stretch'>
            {sortedAccountIds.map((accountId, index) => {
              const isSelected = selectedAccountId === accountId

              return (
                <AccountSelectorOption
                  key={`${accountNumber}-${accountId}-${index}`}
                  accountId={accountId}
                  assetId={assetId}
                  isSelected={isSelected}
                  disabled={disabled}
                  onAccountClick={onAccountSelect}
                />
              )
            })}
          </VStack>
        </Box>
      )
    })
  }, [
    accountIdsByNumberAndType,
    assetId,
    autoSelectHighestBalance,
    disabled,
    getAccountIdsSortedByBalance,
    getAccountIdsSortedByUtxoAccountType,
    onAccountSelect,
    selectedAccountId,
  ])

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader pt={6}>
        <DialogHeaderLeft>
          <DialogCloseButton />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('accountSelector.chooseAccount')}</DialogTitle>
        </DialogHeaderMiddle>
      </DialogHeader>
      <DialogBody maxH='80vh' overflowY='auto'>
        <VStack spacing={0} align='stretch'>
          {accountRows}
        </VStack>
      </DialogBody>
      <DialogFooter>
        <Button colorScheme='blue' onClick={onClose} size='lg' width='full'>
          {translate('common.done')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
