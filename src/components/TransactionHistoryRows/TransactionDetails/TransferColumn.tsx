import type { StackDirection } from '@chakra-ui/react'
import { Box, Button, Stack, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'

import { Address } from './Address'
import { Amount } from './Amount'
import { NftId } from './NftId'
import { Row } from './Row'

type AddressesProps = {
  addresses: string[]
  explorerAddressLink: string
  title: string
}

const defaultAddressesToShow = 3

const Addresses = ({ addresses, explorerAddressLink, title }: AddressesProps) => {
  const [showAll, setShowAll] = useState(false)

  const visibleAddresses = showAll ? addresses : addresses.slice(0, defaultAddressesToShow)

  const handleShowMore = useCallback(() => setShowAll(prevState => !prevState), [setShowAll])

  return (
    <>
      <Row title={title} justifyContent='flex-start' flexDirection='column' alignItems='flex-start'>
        {visibleAddresses.map(address => (
          <Box key={address}>
            <Address explorerAddressLink={explorerAddressLink} address={address} />
          </Box>
        ))}
        {addresses.length > defaultAddressesToShow && (
          <Button size='sm' mt={1} width='100%' onClick={handleShowMore}>
            {showAll ? 'Show Less' : 'Show More'}
          </Button>
        )}
      </Row>
    </>
  )
}

type TransferColumnProps = {
  compactMode?: boolean
} & Transfer

export const TransferColumn = (transfer: TransferColumnProps) => {
  const bgColor = useColorModeValue('white', 'whiteAlpha.100')
  const stackDirection: StackDirection = useMemo(
    () => ({ base: 'column', lg: transfer.compactMode ? 'column' : 'row' }),
    [transfer.compactMode],
  )
  const stackJustify = useMemo(
    () => ({ base: 4, lg: transfer.compactMode ? 4 : 6 }),
    [transfer.compactMode],
  )

  return (
    <Stack
      direction={stackDirection}
      spacing={stackJustify}
      justifyContent='flex-start'
      bg={bgColor}
      borderRadius='lg'
      px={4}
      py={2}
    >
      <Addresses
        addresses={transfer.from}
        explorerAddressLink={transfer.asset.explorerAddressLink}
        title='from'
      />
      <Addresses
        addresses={transfer.to}
        explorerAddressLink={transfer.asset.explorerAddressLink}
        title='to'
      />
      <Row title='for' justifyContent='flex-start' flexDirection='column' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <AssetIcon asset={transfer.asset} size='xs' />
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
