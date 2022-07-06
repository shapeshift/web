import { Button } from '@chakra-ui/button'
import { Box, Link, Stack } from '@chakra-ui/layout'
import { Divider, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FaExchangeAlt } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

type ApproveProps = {
  asset: Asset
  providerIcon?: string
  feeAsset: Asset
  cryptoEstimatedGasFee: string
  disableAction?: boolean
  fiatEstimatedGasFee: string
  learnMoreLink?: string
  loading: boolean
  loadingText?: string
  preFooter?: React.ReactNode
  onConfirm(): Promise<void>
  onCancel(): void
}

export const Approve = ({
  asset,
  cryptoEstimatedGasFee,
  feeAsset,
  providerIcon,
  fiatEstimatedGasFee,
  learnMoreLink,
  loading,
  loadingText,
  preFooter,
  onCancel,
  onConfirm,
}: ApproveProps) => {
  const translate = useTranslate()

  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <Stack
      bg={bgColor}
      borderColor={borderColor}
      borderRadius='xl'
      borderWidth={1}
      divider={<Divider />}
    >
      <Stack flex={1} spacing={6} p={4} textAlign='center'>
        <Stack
          spacing={4}
          direction='row'
          alignItems='center'
          justifyContent='center'
          color='gray.500'
          pt={6}
        >
          <AssetIcon src={asset.icon} size='md' />
          {providerIcon && (
            <>
              <FaExchangeAlt />
              <AssetIcon src={providerIcon} size='md' />
            </>
          )}
        </Stack>
        <Stack>
          <Text fontWeight='bold' translation={['modals.approve.header', { asset: asset.name }]} />
          <Text color='gray.500' translation={['modals.approve.body', { asset: asset.name }]} />
          <Link color='blue.500' href={learnMoreLink} isExternal>
            {translate('modals.approve.learnMore')}
          </Link>
        </Stack>
        <Stack direction='row' justifyContent='space-between'>
          <Button onClick={onCancel} size='lg' width='full' colorScheme='gray' isDisabled={loading}>
            {translate('modals.approve.reject')}
          </Button>
          <Button
            onClick={() => (isConnected ? onConfirm() : handleWalletModalOpen())}
            size='lg'
            colorScheme='blue'
            width='full'
            data-test='defi-modal-approve-button'
            isLoading={loading}
            loadingText={loadingText}
          >
            {translate('modals.approve.confirm')}
          </Button>
        </Stack>
      </Stack>
      <Stack p={4}>
        {preFooter}
        <Row>
          <Row.Label>{translate('modals.approve.estimatedGas')}</Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat value={fiatEstimatedGasFee} />
              <Amount.Crypto
                color='gray.500'
                value={cryptoEstimatedGasFee}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Stack>
    </Stack>
  )
}
