import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Tooltip,
  Tr,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountIdsByChainId,
  selectAccountNumberByAccountId,
  selectFeeAssetByChainId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ImportAccountsDrawerProps = {
  chainId: ChainId
  isOpen: boolean
  onClose: () => void
  toggleAccountId: (accountId: AccountId) => void
  finalFocusRef?: React.RefObject<HTMLElement>
}

type TableRowProps = {
  accountId: AccountId
  feeAsset: Asset
  toggleAccountId: (accountId: AccountId) => void
}

const TableRow = ({ feeAsset, accountId, toggleAccountId }: TableRowProps) => {
  const translate = useTranslate()
  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const handleChange = useCallback(() => toggleAccountId(accountId), [accountId, toggleAccountId])
  const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
  const balanceFilter = useMemo(
    () => ({ assetId: feeAsset.assetId, accountId }),
    [feeAsset, accountId],
  )
  const feeAssetBalancePrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, balanceFilter),
  )
  return (
    <Tr>
      <Td>
        <RawText>{`${translate('common.account')} #${accountNumber}`}</RawText>
      </Td>
      <Td>
        <Switch onChange={handleChange} />
      </Td>
      <Td>
        <Tooltip label={accountLabel}>
          <MiddleEllipsis value={accountLabel} />
        </Tooltip>
      </Td>
      <Td>
        <Amount.Crypto value={feeAssetBalancePrecision} symbol={feeAsset?.symbol ?? ''} />
      </Td>
    </Tr>
  )
}

export const ImportAccountsDrawer = ({
  chainId,
  isOpen,
  onClose,
  toggleAccountId,
  finalFocusRef,
}: ImportAccountsDrawerProps) => {
  const translate = useTranslate()
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const accountIds = useMemo(
    () => accountIdsByChainId[chainId] ?? [],
    [accountIdsByChainId, chainId],
  )
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const chainNamespaceDisplayName = feeAsset?.networkName ?? ''

  if (!feeAsset) {
    console.error(`No fee asset found for chainId: ${chainId}`)
    return null
  }

  return (
    <Drawer
      isOpen={isOpen}
      size='lg'
      placement='right'
      onClose={onClose}
      finalFocusRef={finalFocusRef}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <RawText as='h3'>
            {translate('accountManagementSidebar.title', { chainNamespaceDisplayName })}
          </RawText>
          <Text
            color='text.subtle'
            fontSize='md'
            translation={'accountManagementSidebar.description'}
          />
        </DrawerHeader>

        <DrawerBody>
          <TableContainer>
            <Table variant='simple'>
              <Tbody>
                {accountIds.map(accountId => (
                  <TableRow
                    key={accountId}
                    accountId={accountId}
                    feeAsset={feeAsset}
                    toggleAccountId={toggleAccountId}
                  />
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Button colorScheme='gray' onClick={onClose}>
            {translate('common.loadMore')}
          </Button>
        </DrawerBody>

        <DrawerFooter>
          <Button colorScheme='gray' mr={3} onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          <Button colorScheme='blue'>{translate('common.done')}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
