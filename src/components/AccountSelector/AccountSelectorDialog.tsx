import { VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
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
  const accountBalancesBaseUnit = useSelector(selectPortfolioAccountBalancesBaseUnit)
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const accountsWithDetails = useMemo(
    () =>
      accountIds.map(accountId => {
        const cryptoBalance = bnOrZero(accountBalancesBaseUnit?.[accountId]?.[assetId] ?? 0)
        const fiatBalance = bnOrZero(fromBaseUnit(cryptoBalance, asset.precision ?? 0)).times(
          marketData?.price ?? 0,
        )

        return {
          accountId,
          cryptoBalance: cryptoBalance.toFixed(),
          fiatBalance: fiatBalance.toFixed(2),
        }
      }),
    [accountIds, accountBalancesBaseUnit, assetId, marketData, asset.precision],
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
