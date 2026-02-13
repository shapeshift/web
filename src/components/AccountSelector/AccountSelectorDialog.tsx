import { VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'

import { AccountSelectorOption } from '@/components/AccountSelector/AccountSelectorOption'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { selectPortfolioAccountBalances } from '@/state/slices/common-selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type AccountSelectorDialogProps = {
  isOpen: boolean
  onClose: () => void
  accountIds: AccountId[]
  assetId: AssetId
  asset: Asset
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
  disabled,
  selectedAccountId,
  onAccountSelect,
}: AccountSelectorDialogProps) => {
  const translate = useTranslate()
  const accountBalances = useSelector(selectPortfolioAccountBalances)
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const accountsWithDetails = useMemo(
    () =>
      accountIds.map(accountId => {
        const balance = accountBalances?.[accountId]?.[assetId]
        const fiatBalance = balance
          ? balance
              .toBN()
              .times(marketData?.price ?? 0)
              .toFixed(2)
          : '0.00'

        return {
          accountId,
          cryptoBalance: balance?.toBaseUnit() ?? '0',
          fiatBalance,
        }
      }),
    [accountIds, accountBalances, assetId, marketData],
  )

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
          {accountsWithDetails.map(({ accountId, cryptoBalance, fiatBalance }) => {
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
                disabled={disabled}
                onOptionClick={onAccountSelect}
              />
            )
          })}
        </VStack>
      </DialogBody>
    </Dialog>
  )
}
