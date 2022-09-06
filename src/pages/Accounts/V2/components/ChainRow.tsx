import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Circle, Collapse, IconButton, ListItem, Stack, useDisclosure } from '@chakra-ui/react'
import { ChainId } from '@shapeshiftoss/caip'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountRow } from './AccountRow'

type ChainRowProps = {
  chainId: ChainId
}

export const ChainRow: React.FC<ChainRowProps> = ({ chainId }) => {
  const { isOpen, onToggle } = useDisclosure()
  const history = useHistory()
  const asset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const { color, name } = asset
  return (
    <ListItem as={Card} py={4} pl={2} fontWeight='semibold'>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        px={{ base: 2, md: 4 }}
        py={2}
      >
        <Stack direction='row' fontSize='md' alignItems='center' spacing={4}>
          <Circle size={8} borderWidth={2} borderColor={color} />
          <RawText>{name}</RawText>
        </Stack>
        <Stack direction='row' alignItems='center' spacing={6}>
          <Amount.Fiat value='100' />
          <IconButton
            size='sm'
            variant='ghost'
            isActive={isOpen}
            aria-label='Expand Accounts'
            onClick={onToggle}
            icon={isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
          />
        </Stack>
      </Stack>
      <NestedList as={Collapse} in={isOpen}>
        <AccountRow
          chainColor={color}
          title='Whatever'
          subtitle='Account #0'
          fiatBalance='100'
          accountNumber='0'
          onClick={() => history.push('/dashboard')}
        />
        <AccountRow
          chainColor={color}
          title='Whatever'
          subtitle='Account #0'
          fiatBalance='100'
          accountNumber='1'
          onClick={() => history.push('/dashboard')}
        />
        <AccountRow
          chainColor={color}
          title='Whatever'
          subtitle='Account #0'
          fiatBalance='100'
          accountNumber='2'
          onClick={() => history.push('/dashboard')}
        />
      </NestedList>
    </ListItem>
  )
}
