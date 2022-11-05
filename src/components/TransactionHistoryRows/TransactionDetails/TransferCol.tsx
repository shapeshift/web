import { Stack, useColorModeValue } from '@chakra-ui/react'
import type { TxTransfer } from '@keepkey/chain-adapters'
import { AssetIcon } from 'components/AssetIcon'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

import { Address } from './Address'
import { Amount } from './Amount'
import { Row } from './Row'

type TransferColumnProps = {
  compactMode?: boolean
} & TxTransfer

export const TransferColumn = (transfer: TransferColumnProps) => {
  const asset = useAppSelector(state => selectAssetById(state, transfer.assetId))
  const bgColor = useColorModeValue('white', 'whiteAlpha.100')
  return (
    <Stack
      direction={{ base: 'column', lg: transfer.compactMode ? 'column' : 'row' }}
      spacing={{ base: 4, lg: transfer.compactMode ? 4 : 6 }}
      justifyContent='flex-start'
      bg={bgColor}
      borderRadius='lg'
      px={4}
      py={2}
    >
      <Row title='from' justifyContent='fex-start' flexDirection='column' alignItems='flex-start'>
        <Address explorerAddressLink={asset?.explorerAddressLink} address={transfer.from} />
      </Row>
      <Row title='to' justifyContent='fex-start' flexDirection='column' alignItems='flex-start'>
        <Address explorerAddressLink={asset?.explorerAddressLink} address={transfer.to} />
      </Row>
      <Row title='for' justifyContent='fex-start' flexDirection='column' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <AssetIcon src={asset?.icon} boxSize='4' />
          <Amount value={transfer.value} precision={asset?.precision} symbol={asset?.symbol} />
        </Stack>
      </Row>
    </Stack>
  )
}
