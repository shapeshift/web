import { CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, HStack, IconButton, Link, useColorModeValue } from '@chakra-ui/react'
import type { FC, ReactNode } from 'react'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'

type Props = {
  address: string
  name?: string
  icon?: ReactNode
}

export const AddressSummaryCard: FC<Props> = ({ address, name, icon }) => (
  <Card bg={useColorModeValue('white', 'gray.850')} py={4} pl={4} pr={2} borderRadius='md'>
    <HStack spacing={0}>
      {!!icon && (
        <Box w={10} h={6} pr={4}>
          {icon}
        </Box>
      )}
      <Box flex={1}>
        <MiddleEllipsis value={address} fontSize='lg' fontWeight='medium' />
        {!!name && (
          <RawText color='gray.500' fontWeight='medium' mt={1}>
            {name}
          </RawText>
        )}
      </Box>
      <IconButton
        variant='ghost'
        size='small'
        aria-label='Copy'
        icon={<CopyIcon />}
        p={2}
        onClick={() => navigator.clipboard.writeText(address)}
      />
      <Link href={`https://etherscan.com/address/${address}`} isExternal>
        <IconButton
          icon={<ExternalLinkIcon />}
          variant='ghost'
          size='small'
          aria-label={address}
          p={2}
          colorScheme='gray'
        />
      </Link>
    </HStack>
  </Card>
)
