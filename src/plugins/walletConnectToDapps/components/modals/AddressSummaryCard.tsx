import { Box, Card, HStack, useColorModeValue } from '@chakra-ui/react'
import { CopyButton } from 'plugins/walletConnectToDapps/components/modals/CopyButton'
import { ExternalLinkButton } from 'plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

type AddressSummaryCardProps = {
  address: string
  showWalletProviderName?: boolean
  explorerAddressLink?: string
  icon?: React.ReactNode
}

export const AddressSummaryCard: React.FC<AddressSummaryCardProps> = ({
  address,
  icon,
  explorerAddressLink,
  showWalletProviderName = true,
}) => {
  const walletName = useWallet().state.walletInfo?.name ?? ''
  const bgColor = useColorModeValue('white', 'gray.850')

  if (!explorerAddressLink) return null

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
            <RawText color='text.subtle' fontWeight='medium' mt={1}>
              {walletName}
            </RawText>
          )}
        </Box>
        <CopyButton value={address} />
        <ExternalLinkButton href={`${explorerAddressLink}${address}`} ariaLabel={address} />
      </HStack>
    </Card>
  )
}
