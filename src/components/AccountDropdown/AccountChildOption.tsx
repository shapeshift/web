import type { MenuItemOptionProps } from '@chakra-ui/react'
import { forwardRef, MenuItemOption, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText } from 'components/Text'
import { isUtxoAccountId } from 'lib/utils/utxo'

type AccountChildRowProps = {
  accountId: AccountId
  title: string
  cryptoBalance: string
  symbol: string
  onOptionClick: (accountId: AccountId) => void
} & MenuItemOptionProps

export const AccountChildOption = forwardRef<AccountChildRowProps, 'button'>(
  ({ accountId, title, cryptoBalance, symbol, children, onOptionClick, ...props }, ref) => {
    const color = useColorModeValue('black', 'white')
    const handleClick = useCallback(() => onOptionClick(accountId), [accountId, onOptionClick])
    const { account: pubKey } = fromAccountId(accountId)
    const isUtxo = isUtxoAccountId(accountId)

    return (
      <MenuItemOption ref={ref} color={color} onClick={handleClick} {...props}>
        <Stack direction='row' fontSize='sm' spacing={4} width='full'>
          <RawText fontWeight='bold' whiteSpace='nowrap' flex={1}>
            {title}
          </RawText>
          <Amount.Crypto
            whiteSpace='nowrap'
            color='text.subtle'
            fontWeight='medium'
            value={cryptoBalance}
            symbol={symbol}
          />
          {!isUtxo && <InlineCopyButton value={pubKey} />}
        </Stack>
        {children}
      </MenuItemOption>
    )
  },
)

AccountChildOption.id = 'MenuItemOption'
