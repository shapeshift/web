import { Button } from '@chakra-ui/button'
import { Box, Link, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter } from '@chakra-ui/modal'
import { CircularProgressLabel } from '@chakra-ui/progress'
import { Asset } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

type ApproveProps = {
  asset: Asset
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
  fiatEstimatedGasFee,
  learnMoreLink,
  loading,
  loadingText,
  preFooter,
  onCancel,
  onConfirm,
}: ApproveProps) => {
  const translate = useTranslate()

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <SlideTransition>
      <ModalBody
        width='full'
        textAlign='center'
        display='flex'
        py={6}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <Stack flex={1} spacing={4}>
          <Box>
            <CircularProgress size='120px' thickness='4px' mb={4} isIndeterminate={loading}>
              <CircularProgressLabel>
                <AssetIcon src={asset.icon} boxSize='90px' />
              </CircularProgressLabel>
            </CircularProgress>
          </Box>
          <Text fontWeight='bold' translation={['modals.approve.header', { asset: asset.name }]} />
          <Text color='gray.500' translation={['modals.approve.body', { asset: asset.name }]} />
          <Link color='blue.500' href={learnMoreLink} isExternal>
            {translate('modals.approve.learnMore')}
          </Link>
        </Stack>
      </ModalBody>
      <ModalFooter as={Stack} spacing={4}>
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
      </ModalFooter>
      <ModalFooter py={4} justifyContent='space-between'>
        <Button onClick={onCancel} size='lg' colorScheme='gray' isDisabled={loading}>
          {translate('modals.approve.reject')}
        </Button>
        <Button
          onClick={() => (isConnected ? onConfirm() : handleWalletModalOpen())}
          size='lg'
          colorScheme='blue'
          data-test='defi-modal-approve-button'
          isLoading={loading}
          loadingText={loadingText}
        >
          {translate('modals.approve.confirm')}
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
