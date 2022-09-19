import { CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, HStack, IconButton, Link, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { Card } from 'components/Card/Card'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'

type Props = {
  address: string
  name: string
  url: string
  balance: number
}

export const WalletSummaryCard: FC<Props> = ({ address, name, url, balance }) => (
  <Card bg={useColorModeValue('white', 'gray.850')} pt={4} pb={2} pl={4} borderRadius='md'>
    <HStack spacing={0} mb={4}>
      <FoxIcon color='gray.500' boxSize={6} />
      <Box flex={1} pl={4}>
        <MiddleEllipsis value={address} fontSize='lg' fontWeight='medium' mb={1} />
        <RawText color='gray.500' fontWeight='medium'>
          {name}
        </RawText>
      </Box>
      <IconButton
        variant='ghost'
        aria-label='Copy'
        icon={<CopyIcon />}
        onClick={() => navigator.clipboard.writeText(address)}
      />
      <Link href={url} isExternal>
        <IconButton
          icon={<ExternalLinkIcon />}
          variant='ghost'
          aria-label={address}
          colorScheme='gray'
        />
      </Link>
    </HStack>
    <RawText color='gray.500' fontWeight='medium'>
      Balance: {balance} ETH
    </RawText>
  </Card>
)
