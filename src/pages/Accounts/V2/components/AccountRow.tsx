import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Button,
  ButtonProps,
  Collapse,
  Flex,
  IconButton,
  ListItem,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import { FaCode } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'

import { ChildAssetRow } from './ChildAssetRow'

type AccountRowProps = {
  chainColor: string
  fiatBalance: string
  title: string
  subtitle: string
  accountNumber: string
} & ButtonProps

export const AccountRow: React.FC<AccountRowProps> = ({
  chainColor,
  fiatBalance,
  title,
  subtitle,
  accountNumber,
  ...rest
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const history = useHistory()
  return (
    <ListItem>
      <Flex p={0} flexDir='row' display='flex' gap={2} alignItems='center'>
        <Button
          variant='ghost'
          py={4}
          flex={1}
          height='auto'
          iconSpacing={4}
          leftIcon={
            <Avatar bg={`${chainColor}20`} color={chainColor} size='sm' name={accountNumber} />
          }
          {...rest}
        >
          <Stack alignItems='flex-start' spacing={0}>
            <RawText color='var(--chakra-colors-chakra-body-text)'>{title}</RawText>
            <RawText fontSize='sm' color='gray.500'>
              {subtitle}
            </RawText>
          </Stack>
          <Stack direction='row' alignItems='center' spacing={6} ml='auto'>
            <Amount.Fiat value={fiatBalance} />
          </Stack>
        </Button>
        <IconButton
          size='sm'
          variant='ghost'
          isActive={isOpen}
          aria-label='Expand Account'
          icon={isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
          onClick={onToggle}
        />
      </Flex>

      <NestedList as={Collapse} in={isOpen} pr={0}>
        <ListItem>
          <ChildAssetRow
            title='Asset Name'
            subtitle='Asset Subtitle'
            fiatBalance='100'
            cryptoBalance='100'
            symbol='ETH'
            icon={{ src: 'https://assets.coincap.io/assets/icons/256/eth.png' }}
            onClick={() => history.push('/dashboard')}
          />
          <ChildAssetRow
            title='Asset Name'
            subtitle='Asset Subtitle'
            fiatBalance='100'
            cryptoBalance='100'
            symbol='ETH'
            icon={{ icon: <FaCode />, bg: `${chainColor}20`, color: chainColor }}
            onClick={() => history.push('/dashboard')}
          />
          <ChildAssetRow
            title='Asset Name'
            subtitle='Asset Subtitle'
            fiatBalance='100'
            cryptoBalance='100'
            symbol='ETH'
            icon={{ src: 'https://assets.coincap.io/assets/icons/256/eth.png' }}
            onClick={() => history.push('/dashboard')}
          />
        </ListItem>
      </NestedList>
    </ListItem>
  )
}
