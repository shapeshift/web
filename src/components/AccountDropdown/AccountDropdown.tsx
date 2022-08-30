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
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'

import { RawText, Text } from '../Text'
import { AccountChildOption } from './AccountChildOption'
import { AccountSegment } from './AccountSegement'

export type AccountItem = {
  account: string
  cryptoBalance: string
  name: string
  symbol: string
}

type AccountDropdownProps = {
  onClick: (arg: string) => void
  activeAccount: string | null
  accounts: AccountItem[]
  buttonProps?: ButtonProps
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  onClick,
  accounts,
  buttonProps,
  activeAccount,
}) => {
  const translate = useTranslate()
  const accountList = useMemo(() => {
    const groups = accounts.reduce(
      (entryMap, currentAccount) =>
        entryMap.set(currentAccount.account, [
          ...(entryMap.get(currentAccount.account) || []),
          currentAccount,
        ]),
      new Map(),
    )
    return Array.from(groups.entries())
  }, [accounts])

  const handleClick = (account: string) => {
    onClick(account)
  }

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
          <Text
            fontWeight='bold'
            color='var(--chakra-colors-chakra-body-text)'
            translation={['accounts.accountNumber', { number: activeAccount }]}
          />
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
          {accountList.map((group, id) => {
            const [account, values] = group
            return (
              <>
                <AccountSegment
                  key={id}
                  title={translate('accounts.accountNumber', { number: account })}
                  subtitle='0x1234...1234'
                />
                {values?.map((item: AccountItem, id: number) => (
                  <AccountChildOption
                    value={`${item.account}-${id}`}
                    key={`${item.account}-${id}`}
                    title={item.name}
                    cryptoBalance={item.cryptoBalance}
                    symbol={item.symbol}
                    isChecked={activeAccount === item.account}
                    onClick={() => handleClick(item.account)}
                  />
                ))}
              </>
            )
          })}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
