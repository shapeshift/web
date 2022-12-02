import { Box, HStack, useColorModeValue } from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import { CopyButton } from './CopyButton'
import { ExternalLinkButton } from './ExternalLinkButtons'

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
  const { accountExplorerAddressLink } = useWalletConnect()
  const walletName = useWallet().state.walletInfo?.name ?? ''
  const bgColor = useColorModeValue('white', 'gray.850')

  if (!accountExplorerAddressLink) return null

  return (
    <Card bg={bgColor} py={4} pl={4} pr={2} borderRadius='md'>
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
        <CopyButton value={address} />
        <ExternalLinkButton href={`${accountExplorerAddressLink}${address}`} ariaLabel={address} />
      </HStack>
    </Card>
  )
}
