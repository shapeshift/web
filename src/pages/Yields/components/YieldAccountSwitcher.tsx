import { ChevronDownIcon } from '@chakra-ui/icons'
import type { BoxProps, ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, Menu, MenuButton, MenuItem, MenuList, Text } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ChainIcon } from '@/components/ChainMenu'
import { Display } from '@/components/Display'
import { RawText } from '@/components/Text'
import { useModalChildZIndex } from '@/context/ModalStackProvider'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type YieldAccountSwitcherProps = {
  accountId: AccountId | undefined
  onChange: (accountId: AccountId) => void
  isDisabled?: boolean
  buttonProps?: ButtonProps
  boxProps?: BoxProps
}

type AccountMenuItemProps = {
  accountId: AccountId
  isSelected: boolean
  onAccountClick: (accountId: AccountId) => void
}

const AccountMenuItem = memo(({ accountId, isSelected, onAccountClick }: AccountMenuItemProps) => {
  const { chainId } = useMemo(() => fromAccountId(accountId), [accountId])
  const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])

  const handleClick = useCallback(() => {
    onAccountClick(accountId)
  }, [accountId, onAccountClick])

  return (
    <MenuItem
      onClick={handleClick}
      bg={isSelected ? 'background.surface.raised.pressed' : undefined}
    >
      <Flex alignItems='center' gap={3} width='full'>
        <ChainIcon chainId={chainId} size='sm' />
        <Box flex='1' minWidth={0}>
          <RawText fontWeight='medium' fontSize='sm' noOfLines={1}>
            {accountLabel}
          </RawText>
        </Box>
      </Flex>
    </MenuItem>
  )
})

export const YieldAccountSwitcher = memo(
  ({ accountId, onChange, isDisabled, buttonProps, boxProps }: YieldAccountSwitcherProps) => {
    const translate = useTranslate()
    const modalChildZIndex = useModalChildZIndex()

    const {
      state: { isConnected: isWalletConnected },
    } = useWallet()
    const walletType = useAppSelector(selectWalletType)
    const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
    const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger
    const isConnected = isWalletConnected || isLedgerReadOnly

    const isYieldMultiAccountEnabled = useFeatureFlag('YieldMultiAccount')

    const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

    const hasMultipleAccounts = useMemo(
      () => enabledWalletAccountIds.length > 1,
      [enabledWalletAccountIds.length],
    )

    const shouldShow = useMemo(
      () => isConnected && isYieldMultiAccountEnabled && hasMultipleAccounts,
      [isConnected, isYieldMultiAccountEnabled, hasMultipleAccounts],
    )

    const selectedChainId = useMemo(
      () => (accountId ? fromAccountId(accountId).chainId : undefined),
      [accountId],
    )

    const selectedAccountLabel = useMemo(
      () => (accountId ? accountIdToLabel(accountId) : translate('common.selectAccount')),
      [accountId, translate],
    )

    const handleAccountClick = useCallback(
      (newAccountId: AccountId) => {
        onChange(newAccountId)
      },
      [onChange],
    )

    const isDropdownDisabled = useMemo(
      () => isDisabled || !hasMultipleAccounts,
      [isDisabled, hasMultipleAccounts],
    )

    const rightIcon = useMemo(
      () => (isDropdownDisabled ? null : <ChevronDownIcon />),
      [isDropdownDisabled],
    )

    const buttonLabel = useMemo(
      () => (
        <Flex alignItems='center' gap={2}>
          {selectedChainId && <ChainIcon chainId={selectedChainId} size='xs' />}
          <Display.Desktop>
            <Text fontWeight='medium' color='text.subtle' mr={1}>
              {translate('common.activeAccount')}
            </Text>
          </Display.Desktop>
          <RawText fontWeight='medium' noOfLines={1}>
            {selectedAccountLabel}
          </RawText>
        </Flex>
      ),
      [selectedChainId, selectedAccountLabel, translate],
    )

    const menuItems = useMemo(
      () =>
        enabledWalletAccountIds.map(walletAccountId => (
          <AccountMenuItem
            key={walletAccountId}
            accountId={walletAccountId}
            isSelected={walletAccountId === accountId}
            onAccountClick={handleAccountClick}
          />
        )),
      [enabledWalletAccountIds, accountId, handleAccountClick],
    )

    if (!shouldShow) return null

    return (
      <Box {...boxProps}>
        <Menu isLazy closeOnSelect autoSelect={false}>
          <MenuButton
            as={Button}
            size='sm'
            variant='ghost'
            rightIcon={rightIcon}
            isDisabled={isDropdownDisabled}
            color='text.base'
            {...buttonProps}
          >
            {buttonLabel}
          </MenuButton>
          <MenuList minWidth='220px' maxHeight='300px' overflowY='auto' zIndex={modalChildZIndex}>
            {menuItems}
          </MenuList>
        </Menu>
      </Box>
    )
  },
)
