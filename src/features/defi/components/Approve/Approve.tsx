import { Button } from '@chakra-ui/button'
import { Box, Link, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter } from '@chakra-ui/modal'
import { CircularProgressLabel } from '@chakra-ui/progress'
import { Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

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
  leftSide?: React.ReactNode
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
  leftSide,
  onCancel,
  onConfirm
}: ApproveProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <ModalBody
        width='full'
        textAlign='center'
        display='flex'
        py={6}
        flexDir={{ base: 'column', md: 'row' }}
      >
        {leftSide && leftSide}
        <Stack flex={1} spacing={4}>
          <Box>
            <CircularProgress size='120px' thickness='4px' mt={8} mb={4} isIndeterminate={loading}>
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
      <ModalFooter mt={8}>
        <Stack width='full'>
          <Row pb={2}>
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
          {preFooter}
          <Flex width='full' justifyContent='space-between'>
            <Button onClick={onCancel} size='lg' variant='ghost'>
              {translate('modals.approve.reject')}
            </Button>
            <Button
              onClick={onConfirm}
              size='lg'
              colorScheme='blue'
              isLoading={loading}
              loadingText={loadingText}
            >
              {translate('modals.approve.confirm')}
            </Button>
          </Flex>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
