import { Stack, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'

import { Address } from './Address'
import { Amount } from './Amount'
import { NftId } from './NftId'
import { Row } from './Row'

type TransferColumnProps = {
  compactMode?: boolean
} & Transfer

export const TransferColumn = (transfer: TransferColumnProps) => {
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
      <Row title='from' justifyContent='flex-start' flexDirection='column' alignItems='flex-start'>
        <Address explorerAddressLink={transfer.asset.explorerAddressLink} address={transfer.from} />
      </Row>
      <Row title='to' justifyContent='flex-start' flexDirection='column' alignItems='flex-start'>
        <Address explorerAddressLink={transfer.asset.explorerAddressLink} address={transfer.to} />
      </Row>
      <Row title='for' justifyContent='flex-start' flexDirection='column' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <AssetIcon src={transfer.asset.icon} boxSize='4' />
          <Amount
            value={transfer.value}
            precision={transfer.asset.precision}
            symbol={transfer.asset.symbol}
          />
        </Stack>
        {transfer.id && (
          <NftId
            explorer={transfer.asset.explorer}
            id={transfer.id}
            assetReference={fromAssetId(transfer.assetId).assetReference}
          />
        )}
      </Row>
    </Stack>
  )
}
