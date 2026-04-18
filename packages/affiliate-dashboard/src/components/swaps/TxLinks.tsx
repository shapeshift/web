import { Badge, Box, Link, Stack, Text } from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'

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
    <Stack spacing={1} fontFamily='mono' fontSize='xs'>
      {sellTxHash && (
        <Box display='inline-flex' alignItems='center' gap={2}>
          <Badge
            px={1.5}
            py={0.5}
            borderRadius='sm'
            bg='pill.asset'
            color='pill.assetFg'
            fontSize='10px'
            fontWeight={600}
            textTransform='none'
            minW='36px'
            textAlign='center'
          >
            {sellAsset.symbol}
          </Badge>
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
        <Box display='inline-flex' alignItems='center' gap={2}>
          <Badge
            px={1.5}
            py={0.5}
            borderRadius='sm'
            bg='pill.asset'
            color='pill.assetFg'
            fontSize='10px'
            fontWeight={600}
            textTransform='none'
            minW='36px'
            textAlign='center'
          >
            {buyAsset.symbol}
          </Badge>
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
