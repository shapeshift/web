import {
  forwardRef,
  MenuItemOption,
  type MenuItemOptionProps,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import { type AccountId, type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText } from 'components/Text'

type AccountChildRowProps = {
  accountId: AccountId
  title: string
  cryptoBalance: string
  symbol: string
  onOptionClick: (accountId: AccountId) => void
  chainId: ChainId
} & MenuItemOptionProps

export const AccountChildOption = forwardRef<AccountChildRowProps, 'button'>(
  (
    { accountId, title, cryptoBalance, symbol, children, onOptionClick, chainId, ...props },
    ref,
  ) => {
    const color = useColorModeValue('black', 'white')
    const handleClick = useCallback(() => onOptionClick(accountId), [accountId, onOptionClick])
    return (
      <MenuItemOption ref={ref} color={color} onClick={handleClick} {...props}>
        <Stack direction='row' justifyContent='space-between' fontSize='sm' spacing={4}>
          <InlineCopyButton
            isDisabled={isUtxoChainId(chainId)}
            value={fromAccountId(accountId).account}
          >
            <RawText fontWeight='bold' whiteSpace='nowrap'>
              {title}
            </RawText>
          </InlineCopyButton>
          <Amount.Crypto
            whiteSpace='nowrap'
            color='text.subtle'
            fontWeight='medium'
            value={cryptoBalance}
            symbol={symbol}
          />
        </Stack>
        {children}
      </MenuItemOption>
    )
  },
)

AccountChildOption.id = 'MenuItemOption'
