import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonProps,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  Stack,
} from '@chakra-ui/react'
import {
  AccountId,
  AssetId,
  CHAIN_NAMESPACE,
  fromAccountId,
  fromAssetId,
  fromChainId,
} from '@shapeshiftoss/caip'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { ReduxState } from 'state/reducer'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectPortfolioAccountIds,
  selectPortfolioAccountMetadata,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RawText } from '../Text'
import { AccountChildOption } from './AccountChildOption'
import { AccountSegment } from './AccountSegement'

type AccountDropdownProps = {
  assetId: AssetId
  buttonProps?: ButtonProps
  onChange?: (accountId: AccountId) => void
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  assetId,
  buttonProps,
  onChange,
}) => {
  const { chainId } = fromAssetId(assetId)
  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  // TODO(0xdef1cafe): selectPortfolioAccountIdsByChainId
  const allAccountIds = useSelector(selectPortfolioAccountIds)
  const accountIds = allAccountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)

  type AccountIdsByNumberAndType = {
    [k: number]: AccountId[]
  }
  const initial: AccountIdsByNumberAndType = {}
  const accountIdsByNumberAndType = accountIds.reduce((acc, accountId) => {
    const { accountNumber } = accountMetadata[accountId].bip44Params
    if (!acc[accountNumber]) acc[accountNumber] = []
    acc[accountNumber].push(accountId)
    return acc
  }, initial)

  const [selectedAccountId, setSelectedAccountId] = useState<AccountId>(accountIds[0])
  const asset = useAppSelector((s: ReduxState) => selectAssetById(s, assetId))
  const translate = useTranslate()
  const chainAdapter = getChainAdapterManager().get(chainId)

  const onClick = (accountId: AccountId) => {
    setSelectedAccountId(accountId)
    // don't fire if not changed
    accountId !== selectedAccountId && onChange?.(accountId)
  }

  const makeTitle = useCallback(
    (accountId: AccountId) => {
      /**
       * for UTXO chains, we want the title to be the account type
       * for account-based chains, we want the title to be the asset name
       */
      const { chainNamespace } = fromChainId(chainId)
      switch (chainNamespace) {
        // note - conceptually this is really CHAIN_NAMESPACE.UTXO
        case CHAIN_NAMESPACE.Bitcoin: {
          return accountIdToLabel(accountId)
        }
        default: {
          return asset.name
        }
      }
    },
    [chainId, asset],
  )

  return (
    <Menu closeOnSelect={false} matchWidth>
      <MenuButton
        as={Button}
        size='sm'
        rightIcon={<ChevronDownIcon />}
        variant='ghost'
        {...buttonProps}
      >
        <Stack direction='row' alignItems='center'>
          <RawText fontWeight='bold' color='var(--chakra-colors-chakra-body-text)'>
            {translate('accounts.accountNumber', { number: selectedAccountId })}
          </RawText>
          <MiddleEllipsis
            shouldShorten
            fontFamily='monospace'
            value='0xd11c4891E5Ee56004Db606648563702de18A6Eed'
          />
          <RawText fontFamily='monospace' color='gray.500'></RawText>
        </Stack>
      </MenuButton>
      <MenuList minWidth='240px' maxHeight='200px' overflowY='auto'>
        <MenuOptionGroup defaultValue='asc' type='radio'>
          {Object.entries(accountIdsByNumberAndType).map(([accountNumber, accountIds]) => {
            return (
              <>
                <AccountSegment
                  key={accountNumber}
                  title={translate('accounts.accountNumber', { number: accountNumber })}
                  // subtitle={accountIdToLabel(accountId)} // hide me until we have the option to "nickname" accounts
                />
                {accountIds.map(accountId => {
                  // const accountMetadataForAccountId = accountMetadata[accountId]
                  // const supportedAccountTypes = chainAdapter?.getSupportedAccountTypes?.() ?? [
                  //   undefined,
                  // ]
                  return (
                    <AccountChildOption
                      key={accountId}
                      title={makeTitle(accountId)}
                      cryptoBalance={'420'}
                      symbol={asset.symbol}
                      isChecked={selectedAccountId === accountId}
                      onClick={() => onClick(accountId)}
                    />
                  )
                })}
              </>
            )
          })}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
