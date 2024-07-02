import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CopyIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import {
  Avatar,
  Button,
  Collapse,
  Flex,
  IconButton,
  ListItem,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Stack,
  Tag,
  useDisclosure,
} from '@chakra-ui/react'
import { type AccountId, type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { MdOutlineMoreVert } from 'react-icons/md'
import { RiWindow2Line } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'
import { useCopyToClipboard } from 'hooks/useCopyToClipboard'
import { getAccountTitle } from 'lib/utils/accounts'
import { isUtxoAccountId, isUtxoChainId } from 'lib/utils/utxo'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectPortfolioAccountBalanceByAccountNumberAndChainId,
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountEntryRow } from './AccountEntryRow'

type ViewOnlyAccountRowProps = {
  accountId: AccountId
  chainId: ChainId
} & ButtonProps

type UtxoAccountEntriesProps = {
  accountIds: AccountId[]
  chainId: ChainId
}

const mdOutlineMoreVertIcon = <MdOutlineMoreVert />
const riWindow2LineIcon = <RiWindow2Line />
const arrowDownIcon = <ArrowDownIcon />
const arrowUpIcon = <ArrowUpIcon />
const copyIcon = <CopyIcon />
const checkIcon = <CheckIcon />

const UtxoAccountEntries: React.FC<UtxoAccountEntriesProps> = ({ accountIds, chainId }) => {
  const feeAsset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const assetId = feeAsset?.assetId

  const result = useMemo(
    () =>
      assetId ? (
        <>
          {accountIds.map(accountId => (
            <AccountEntryRow
              key={`${assetId}-${accountId}`}
              accountId={accountId}
              assetId={assetId}
            />
          ))}
        </>
      ) : null,
    [accountIds, assetId],
  )

  return result
}

type AccountBasedChainEntriesProps = {
  accountId: AccountId
}
const AccountBasedChainEntries: React.FC<AccountBasedChainEntriesProps> = ({ accountId }) => {
  const accountAssetBalancesSortedUserCurrency = useSelector(
    selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
  )
  const assetIds = useMemo(
    () => Object.keys(accountAssetBalancesSortedUserCurrency[accountId] ?? {}),
    [accountAssetBalancesSortedUserCurrency, accountId],
  )
  const result = useMemo(
    () => (
      <>
        {assetIds.map(assetId => (
          <AccountEntryRow key={assetId} accountId={accountId} assetId={assetId} />
        ))}
      </>
    ),
    [accountId, assetIds],
  )

  return result
}

const viewOnlyButtonFontSizeProps = { base: 'sm', md: 'md' }
export const ViewOnlyAccountRow: React.FC<ViewOnlyAccountRowProps> = ({
  accountId,
  chainId,
  ...buttonProps
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
  const translate = useTranslate()
  const assets = useSelector(selectAssets)
  const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])
  const filter = useMemo(() => ({ accountNumber: 1337, chainId, isViewOnly: true }), [chainId])
  const fiatBalance = useAppSelector(s =>
    selectPortfolioAccountBalanceByAccountNumberAndChainId(s, filter),
  )
  const feeAsset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const color = feeAsset?.networkColor ?? feeAsset?.color ?? ''
  const leftIcon = useMemo(
    // space in string interpolation is not a bug - see Chakra UI Avatar docs
    () => <Avatar bg={`${color}20`} color={color} size='sm' name='View-Only' />,
    [color],
  )

  /**
   * for UTXO chains, we want to display accounts aggregated by accountNumber first,
   * then script type second, e.g. bitcoin Account #0, then Legacy/Segwit/Segwit Native
   * i.e. there can be multiple accounts per accountNumber
   *
   * for account-based chains, there can only be one account per accountNumber
   * so we aggregate by account, then assets belonging to that account
   */
  const accountEntries = useMemo(
    // This won't work - we don't do account entries, this is a single address, but this is just a PoC confirming this works OoTB, just don't input BTC for testing
    () =>
      isUtxoAccount ? (
        <UtxoAccountEntries chainId={chainId} accountIds={[accountId]} />
      ) : (
        <AccountBasedChainEntries accountId={accountId} />
      ),
    [accountId, chainId, isUtxoAccount],
  )

  const title = useMemo(() => {
    return getAccountTitle(accountId, assets)
  }, [assets, accountId])

  const fontFamily = useMemo(() => (!isUtxoChainId(chainId) ? 'monospace' : ''), [chainId])

  const handleCopyClick = useCallback(() => {
    const account = fromAccountId(accountId).account
    copyToClipboard(account)
  }, [accountId, copyToClipboard])

  return (
    <ListItem>
      <Flex p={0} flexDir='row' display='flex' gap={2} alignItems='center'>
        <Button
          variant='ghost'
          py={4}
          flex={1}
          height='auto'
          iconSpacing={4}
          data-test='account-row-button'
          fontSize={viewOnlyButtonFontSizeProps}
          leftIcon={leftIcon}
          {...buttonProps}
          onClick={onToggle}
        >
          <Stack alignItems='flex-start' spacing={0}>
            <RawText color='var(--chakra-colors-chakra-body-text)' fontFamily={fontFamily}>
              {title}
            </RawText>
            <Tag fontSize='sm' color='text.subtle'>
              {translate('View Only')}
            </Tag>
          </Stack>
          <Stack direction='row' alignItems='center' spacing={6} ml='auto'>
            <Amount.Fiat value={fiatBalance} />
          </Stack>
        </Button>
        {buttonProps.onClick && (
          <Menu>
            <MenuButton
              as={IconButton}
              size='sm'
              variant='ghost'
              aria-label={translate('accounts.expandAccount')}
              icon={mdOutlineMoreVertIcon}
            />
            <MenuList>
              <MenuGroup title={translate('View Only')} color='text.subtle'>
                <MenuItem
                  icon={riWindow2LineIcon}
                  onClick={buttonProps.onClick && buttonProps.onClick}
                >
                  {translate('accounts.viewAccount')}
                </MenuItem>
                <MenuItem onClick={onToggle} icon={isOpen ? arrowUpIcon : arrowDownIcon}>
                  {translate(isOpen ? 'accounts.hideAssets' : 'accounts.showAssets')}
                </MenuItem>
                <MenuItem onClick={handleCopyClick} icon={isCopied ? checkIcon : copyIcon}>
                  {translate(isCopied ? 'common.copied' : 'common.copy')}
                </MenuItem>
              </MenuGroup>
            </MenuList>
          </Menu>
        )}
      </Flex>
      <NestedList as={Collapse} in={isOpen} pr={0}>
        <ListItem>{accountEntries}</ListItem>
      </NestedList>
    </ListItem>
  )
}
