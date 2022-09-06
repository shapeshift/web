import { Avatar, Button, ButtonProps, Flex, ListItem, Stack } from '@chakra-ui/react'
import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { generatePath } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import {
  selectAssetById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChildAssetRowProps = {
  accountId: AccountId
  assetId: AssetId
} & ButtonProps

export const ChildAssetRow: React.FC<ChildAssetRowProps> = ({ accountId, assetId, ...rest }) => {
  const history = useHistory()
  const filter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const asset = useAppSelector(s => selectAssetById(s, assetId))
  const cryptoBalance = useAppSelector(s => selectPortfolioCryptoHumanBalanceByFilter(s, filter))
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByFilter(s, filter))
  const { icon, name, symbol } = asset
  return (
    <ListItem>
      <Button
        variant='ghost'
        py={4}
        width='full'
        height='auto'
        iconSpacing={4}
        leftIcon={<Avatar size='sm' src={icon} />}
        onClick={() => history.push(generatePath('/accounts/:accountId/:assetId', filter))}
        {...rest}
      >
        <Stack alignItems='flex-start' spacing={0} flex={1}>
          <RawText color='var(--chakra-colors-chakra-body-text)'>{name}</RawText>
          {/* <RawText fontSize='sm' color='gray.500'>
            {subtitle}
          </RawText> */}
        </Stack>
        <Flex flex={1} justifyContent='flex-end' display={{ base: 'none', md: 'flex' }}>
          <Amount.Crypto value={cryptoBalance} symbol={symbol} />
        </Flex>
        <Flex flex={1} justifyContent='flex-end' alignItems='flex-end' direction='column'>
          <Amount.Fiat value={fiatBalance} />
          <Amount.Crypto
            value={cryptoBalance}
            symbol={symbol}
            fontSize='sm'
            display={{ base: 'block', md: 'none' }}
          />
        </Flex>
      </Button>
    </ListItem>
  )
}
