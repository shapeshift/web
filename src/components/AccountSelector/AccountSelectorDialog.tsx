import { Button, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import sortBy from 'lodash/sortBy'
import type { Asset } from 'packages/types/src/base'
import { useCallback, useMemo } from 'react'
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
import { selectPortfolioAccountBalancesBaseUnit } from '@/state/slices/common-selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type AccountSelectorDialogProps = {
  isOpen: boolean
  onClose: () => void
  accountIds: AccountId[]
  assetId: AssetId
  asset: Asset
  autoSelectHighestBalance: boolean | undefined
  disabled: boolean | undefined
  selectedAccountId: AccountId | undefined
  onAccountSelect: (accountId: AccountId) => void
}

export const AccountSelectorDialog = ({
  isOpen,
  onClose,
  accountIds,
  assetId,
  asset,
  autoSelectHighestBalance,
  disabled,
  selectedAccountId,
  onAccountSelect,
}: AccountSelectorDialogProps) => {
  const translate = useTranslate()
  const accountBalances = useSelector(selectPortfolioAccountBalancesBaseUnit)
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const sortedAccountIds = useMemo(() => {
    if (!autoSelectHighestBalance) return accountIds

    return sortBy(
      accountIds,
      accountId => -bnOrZero(accountBalances?.[accountId]?.[assetId] ?? 0).toNumber(),
    )
  }, [autoSelectHighestBalance, accountIds, accountBalances, assetId])

  const accountsWithDetails = useMemo(
    () =>
      sortedAccountIds.map(accountId => {
        const cryptoBalance = bnOrZero(accountBalances?.[accountId]?.[assetId] ?? 0)
        const fiatBalance = bnOrZero(fromBaseUnit(cryptoBalance, asset.precision ?? 0)).times(
          marketData?.price ?? 0,
        )

        return {
          accountId,
          cryptoBalance: cryptoBalance.toFixed(),
          fiatBalance: fiatBalance.toFixed(2),
        }
      }),
    [sortedAccountIds, accountBalances, assetId, marketData, asset.precision],
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
        <VStack spacing={2} align='stretch'>
          {accountsWithDetails.map(({ accountId, cryptoBalance, fiatBalance }, accountNumber) => {
            const isSelected = selectedAccountId === accountId

            return (
              <AccountSelectorOption
                key={accountId}
                accountId={accountId}
                cryptoBalance={cryptoBalance}
                fiatBalance={fiatBalance}
                assetId={assetId}
                symbol={asset.symbol}
                isSelected={isSelected}
                accountNumber={accountNumber + 1}
                disabled={disabled}
                onOptionClick={onAccountSelect}
              />
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
