import { CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, HStack, IconButton, Link, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

type AddressSummaryCardProps = {
  address: string
  showWalletProviderName?: boolean
  icon?: React.ReactNode
}

export const AddressSummaryCard: React.FC<AddressSummaryCardProps> = ({
  address,
  icon,
  showWalletProviderName = true,
}) => {
  const walletName = useWallet().state.walletInfo?.name ?? ''
  const handleCopyAddressClick = useCallback(
    () => navigator.clipboard.writeText(address),
    [address],
  )
  return (
    <Card bg={useColorModeValue('white', 'gray.850')} py={4} pl={4} pr={2} borderRadius='md'>
      <HStack spacing={0}>
        {icon && (
          <Box w={10} h={6} pr={4}>
            {icon}
          </Box>
        )}
        <Box flex={1}>
          <MiddleEllipsis value={address} fontSize='lg' fontWeight='medium' />
          {showWalletProviderName && (
            <RawText color='gray.500' fontWeight='medium' mt={1}>
              {walletName}
            </RawText>
          )}
        </Box>
        <IconButton
          variant='ghost'
          size='small'
          aria-label='Copy'
          icon={<CopyIcon />}
          p={2}
          onClick={handleCopyAddressClick}
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
}
