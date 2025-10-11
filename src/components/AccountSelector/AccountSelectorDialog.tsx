import { Box, Button, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { chain, sortBy } from 'lodash'
import type { Asset } from 'packages/types/src/base'
import { UtxoAccountType } from 'packages/types/src/base'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'

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
import { fromBaseUnit } from '@/lib/math'
import { selectPortfolioAccountBalancesBaseUnit } from '@/state/slices/common-selectors'
import { selectPortfolioAccountMetadata } from '@/state/slices/selectors'

const utxoAccountTypeToDisplayPriority = (accountType: UtxoAccountType | undefined) => {
  switch (accountType) {
    case UtxoAccountType.SegwitNative:
      return 0
    case UtxoAccountType.SegwitP2sh:
      return 1
    case UtxoAccountType.P2pkh:
      return 2
    // We found something else, put it at the end
    default:
      return 3
  }
}

export type AccountIdsByNumberAndType = {
  [k: number]: AccountId[]
}

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
      chain(accountIds)
        .sortBy(accountIds, accountId =>
          bnOrZero(accountBalances?.[accountId]?.[assetId] ?? 0).toNumber(),
        )
        .reverse()
        .value(),
    [accountBalances, assetId],
  )

  const handleDone = useCallback(() => {
    onClose()
  }, [onClose])

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
          {Object.entries(accountIdsByNumberAndType).map(([accountNumber, accountIds]) => {
            const sortedAccountIds = autoSelectHighestBalance
              ? getAccountIdsSortedByBalance(accountIds)
              : getAccountIdsSortedByUtxoAccountType(accountIds)

            if (accountIds.length === 0) return null

            return (
              <Box key={accountNumber}>
                <VStack spacing={2} align='stretch'>
                  {sortedAccountIds.map((accountId, index) => {
                    const cryptoBalance = fromBaseUnit(
                      accountBalances?.[accountId]?.[assetId] ?? 0,
                      asset?.precision ?? 0,
                    )
                    const isSelected = selectedAccountId === accountId

                    return (
                      <AccountSelectorOption
                        key={`${accountNumber}-${accountId}-${index}`}
                        accountId={accountId}
                        accountNumber={Number(accountNumber)}
                        cryptoBalance={cryptoBalance}
                        assetId={assetId}
                        symbol={asset?.symbol ?? ''}
                        isSelected={isSelected}
                        disabled={disabled}
                        onOptionClick={onAccountSelect}
                      />
                    )
                  })}
                </VStack>
              </Box>
            )
          })}
        </VStack>
      </DialogBody>
      <DialogFooter>
        <Button colorScheme='blue' onClick={handleDone} size='lg' width='full'>
          {translate('common.done')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
