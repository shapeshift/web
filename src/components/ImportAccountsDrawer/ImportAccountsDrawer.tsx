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
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectFeeAssetByChainId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ImportAccountsDrawerProps = {
  accountIds: AccountId[]
  isOpen: boolean
  onClose: () => void
  toggleAccountId: (accountId: AccountId) => void
  finalFocusRef?: React.RefObject<HTMLElement>
}

type TableRowProps = {
  accountId: AccountId
  toggleAccountId: (accountId: AccountId) => void
}

const TableRow = ({ accountId, toggleAccountId }: TableRowProps) => {
  const translate = useTranslate()
  const accountNumberFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )
  const handleChange = useCallback(() => toggleAccountId(accountId), [accountId, toggleAccountId])
  const accountLabel = useMemo(() => accountIdToLabel(accountId), [accountId])
  const chainId = useMemo(() => fromAccountId(accountId).chainId, [accountId])
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  console.log({ chainId, feeAsset })
  const balanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
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
  accountIds,
  isOpen,
  onClose,
  toggleAccountId,
  finalFocusRef,
}: ImportAccountsDrawerProps) => {
  const translate = useTranslate()
  const chainNamespaceDisplayName = 'Ethereum' // TODO: make this dynamic
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
