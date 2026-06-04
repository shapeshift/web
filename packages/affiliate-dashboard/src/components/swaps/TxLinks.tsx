import { Box, Link, Stack, Text } from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'
import { AssetPill } from './AssetPill'

const shortenHash = (hash: string): string => {
  const prefix = hash.startsWith('0x') ? '0x' : ''
  const body = hash.slice(prefix.length)
  return `${prefix}${body.slice(0, 4)}...${body.slice(-4)}`
}

interface TxLinksProps {
  swap: AffiliateSwap
}

export const TxLinks = ({ swap }: TxLinksProps): React.JSX.Element => {
  const { sellAsset, buyAsset, sellTxHash, buyTxHash } = swap

  if (!sellTxHash && !buyTxHash) {
    return (
      <Text color='fg.dim' fontFamily='mono' fontSize='xs'>
        —
      </Text>
    )
  }

  return (
    <Stack spacing={1.5} fontFamily='mono' fontSize='sm'>
      {sellTxHash && (
        <Box display='inline-flex' alignItems='center' gap={3}>
          <AssetPill asset={sellAsset} size='sm' showNetworkIcon={false} />
          <Link
            href={`${sellAsset.explorerTxLink}${sellTxHash}`}
            isExternal
            color='pill.assetFg'
            _hover={{ color: 'brand.300', textDecoration: 'underline' }}
          >
            {shortenHash(sellTxHash)}
          </Link>
        </Box>
      )}
      {buyTxHash && (
        <Box display='inline-flex' alignItems='center' gap={3}>
          <AssetPill asset={buyAsset} size='sm' showNetworkIcon={false} />
          <Link
            href={`${buyAsset.explorerTxLink}${buyTxHash}`}
            isExternal
            color='pill.assetFg'
            _hover={{ color: 'brand.300', textDecoration: 'underline' }}
          >
            {shortenHash(buyTxHash)}
          </Link>
        </Box>
      )}
    </Stack>
  )
}
