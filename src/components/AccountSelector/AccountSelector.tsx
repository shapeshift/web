import type { BoxProps, ButtonProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  HStack,
  Icon,
  Text,
  useDisclosure,
  usePrevious,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import isEmpty from 'lodash/isEmpty'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { RiExpandUpDownLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'

import type { AccountIdsByNumberAndType } from '@/components/AccountSelector/AccountSelectorDialog'
import { AccountSelectionDialog } from '@/components/AccountSelector/AccountSelectorDialog'
import { AssetIcon } from '@/components/AssetIcon'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isValidAccountNumber } from '@/lib/utils/accounts'
import type { ReduxState } from '@/state/reducer'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectHighestUserCurrencyBalanceAccountByAssetId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectPortfolioAccountMetadata,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type AccountSelectorDialogProps = {
  assetId: AssetId
  onChange: (accountId: AccountId) => void
  defaultAccountId?: AccountId
  // Auto-selects the account with the highest balance, and sorts the account list descending by balance
  autoSelectHighestBalance?: boolean
  // Prevents accounts in the dropdown from being selected
  disabled?: boolean
  buttonProps?: ButtonProps
  boxProps?: BoxProps
}

const chevronIconSx = {
  svg: {
    h: '18px',
    w: '18px',
  },
}

export const AccountSelector: FC<AccountSelectorDialogProps> = memo(
  ({
    assetId,
    buttonProps,
    onChange: handleChange,
    disabled,
    defaultAccountId,
    autoSelectHighestBalance,
    boxProps,
  }) => {
    const filter = useMemo(() => ({ assetId }), [assetId])
    const accountIds = useAppSelector((s: ReduxState) =>
      selectPortfolioAccountIdsByAssetIdFilter(s, filter),
    )
    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId),
    )

    const translate = useTranslate()
    const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))
    const { isOpen, onOpen, onClose } = useDisclosure()
    const {
      number: { localeParts },
    } = useLocaleFormatter()

    if (!asset) throw new Error(`AccountDropdown: no asset found for assetId ${assetId}!`)

    const accountMetadata = useSelector(selectPortfolioAccountMetadata)
    const accountBalances = useSelector(selectPortfolioAccountBalancesBaseUnit)
    const highestUserCurrencyBalanceAccountId = useAppSelector(state =>
      selectHighestUserCurrencyBalanceAccountByAssetId(state, { assetId }),
    )
    const [selectedAccountId, setSelectedAccountId] = useState<AccountId | undefined>(
      defaultAccountId,
    )

    // very suspicious of this
    // Poor man's componentDidUpdate until we figure out why this re-renders like crazy
    const previousSelectedAccountId = usePrevious(selectedAccountId)
    const isButtonDisabled = disabled || accountIds.length <= 1

    /**
     * react on selectedAccountId change
     */
    useEffect(() => {
      if (isEmpty(accountMetadata)) return // not enough data to set an AccountId
      if (!selectedAccountId || previousSelectedAccountId === selectedAccountId) return // no-op, this would fire onChange an infuriating amount of times
      handleChange(selectedAccountId)
    }, [accountMetadata, previousSelectedAccountId, selectedAccountId, handleChange])

    /**
     * react on accountIds on first render
     */
    useEffect(() => {
      if (!accountIds.length) return
      const validatedAccountIdFromArgs = accountIds.find(
        accountId => accountId === defaultAccountId,
      )
      const firstAccountId = accountIds[0]
      // Use the first accountId if we don't have a valid defaultAccountId
      const preSelectedAccountId =
        validatedAccountIdFromArgs ??
        (autoSelectHighestBalance ? highestUserCurrencyBalanceAccountId : undefined) ??
        firstAccountId
      if (previousSelectedAccountId === preSelectedAccountId) return
      /**
       * assert asset the chainId of the accountId and assetId match
       */
      const accountIdChainId = fromAccountId(preSelectedAccountId).chainId
      const assetIdChainId = fromAssetId(assetId).chainId
      if (accountIdChainId !== assetIdChainId) {
        throw new Error('AccountDropdown: chainId mismatch!')
      }
      setSelectedAccountId(preSelectedAccountId)
    }, [
      assetId,
      accountIds,
      defaultAccountId,
      highestUserCurrencyBalanceAccountId,
      autoSelectHighestBalance,
      previousSelectedAccountId,
    ])

    const handleAccountSelect = useCallback(
      (accountId: AccountId) => {
        setSelectedAccountId(accountId)
        onClose()
      },
      [onClose],
    )

    /**
     * memoized view bits and bobs
     */
    const accountLabel = useMemo(
      () => selectedAccountId && accountIdToLabel(selectedAccountId),
      [selectedAccountId],
    )

    const accountNumber: number | undefined = useMemo(
      () => selectedAccountId && accountMetadata[selectedAccountId]?.bip44Params?.accountNumber,
      [accountMetadata, selectedAccountId],
    )

    const rightIcon = useMemo(
      () => (isButtonDisabled ? null : <Icon as={RiExpandUpDownLine} color='text.subtle' />),
      [isButtonDisabled],
    )

    /**
     * for UTXO-based chains, we can have many accounts for a single account number
     * e.g. account 0 can have legacy, segwit, and segwit native
     *
     * this allows us to render the multiple account varieties and their balances for
     * the native asset for UTXO chains, or a single row with the selected asset for
     * account based chains that support tokens
     */
    const accountIdsByNumberAndType = useMemo(() => {
      const initial: AccountIdsByNumberAndType = {}
      return accountIds.reduce((acc, accountId) => {
        const account = accountMetadata[accountId]
        if (!account) return acc
        const { accountNumber } = account.bip44Params
        if (!acc[accountNumber]) acc[accountNumber] = []
        acc[accountNumber].push(accountId)
        return acc
      }, initial)
    }, [accountIds, accountMetadata])

    // Get selected account details for the button
    const selectedAccountDetails = useMemo(() => {
      if (!selectedAccountId || !asset) return null

      const cryptoBalance = fromBaseUnit(
        accountBalances?.[selectedAccountId]?.[assetId] ?? 0,
        asset?.precision ?? 0,
      )
      const fiatBalance = bnOrZero(cryptoBalance).times(marketData?.price ?? 0)

      return {
        fiatBalance,
        accountAddress: fromAccountId(selectedAccountId).account,
      }
    }, [selectedAccountId, asset, accountBalances, assetId, marketData])

    /**
     * do NOT remove these checks, this is not a visual thing, this is a safety check!
     *
     * this component is responsible for selecting the correct account for operations where
     * we are sending funds, we need to be paranoid.
     */
    if (!accountIds.length) return null
    if (!isValidAccountNumber(accountNumber)) return null
    if (!Object.keys(accountIdsByNumberAndType).length) return null
    if (!accountLabel) return null

    return (
      <>
        <Box px={2} my={2} {...boxProps}>
          <Button
            onClick={onOpen}
            isDisabled={isButtonDisabled}
            variant='ghost'
            size='lg'
            width='full'
            justifyContent='space-between'
            p={4}
            borderRadius='xl'
            color='text.primary'
            {...buttonProps}
          >
            <HStack spacing={3} flex={1}>
              <AssetIcon assetId={assetId} size='sm' borderRadius='full' />
              <VStack align='start' spacing={0} flex={1}>
                <Text fontSize='md' fontWeight='bold'>
                  <MiddleEllipsis value={selectedAccountDetails?.accountAddress ?? ''} />
                </Text>
                {selectedAccountDetails && (
                  <VStack align='start' spacing={0} mt={1}>
                    <Text fontSize='sm' color='text.subtle' fontWeight='normal'>
                      {translate('modals.send.sendForm.availableBalance', {
                        balance: `${localeParts.prefix}${selectedAccountDetails.fiatBalance.toFixed(
                          2,
                        )}`,
                      })}
                    </Text>
                  </VStack>
                )}
              </VStack>
              <Box sx={chevronIconSx} fontSize='xs'>
                {rightIcon}
              </Box>
            </HStack>
          </Button>
        </Box>

        <AccountSelectionDialog
          isOpen={isOpen}
          onClose={onClose}
          accountIdsByNumberAndType={accountIdsByNumberAndType}
          asset={asset}
          autoSelectHighestBalance={autoSelectHighestBalance}
          disabled={disabled}
          selectedAccountId={selectedAccountId}
          onAccountSelect={handleAccountSelect}
        />
      </>
    )
  },
)
