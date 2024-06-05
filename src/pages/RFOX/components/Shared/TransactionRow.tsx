import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Collapse,
  Flex,
  Link,
  Text,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { getTxLink } from 'lib/getTxLink'
import { selectAssetById, selectFeeAssetByChainId, selectTxById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type TransactionRowProps = {
  assetId: AssetId
  onStart: () => void
  onSignAndBroadcast: (() => Promise<void>) | undefined
  headerCopy: string
  isActive?: boolean
  isLast?: boolean
  isActionable: boolean
  txId?: string
  serializedTxIndex: string | undefined
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  headerCopy,
  onStart,
  isActive,
  isActionable,
  serializedTxIndex,
  onSignAndBroadcast,
  txId,
}) => {
  const translate = useTranslate()

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex ?? ''))
  const status = useMemo(() => tx?.status, [tx?.status])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(assetId).chainId),
  )

  const txIdLink = useMemo(
    () =>
      getTxLink({
        defaultExplorerBaseUrl: asset?.explorerTxLink ?? '',
        tradeId: txId ?? '',
        name: SwapperName.ArbitrumBridge,
      }),
    [asset?.explorerTxLink, txId],
  )

  const handleSignTx = useCallback(async () => {
    setIsSubmitting(true)

    await onSignAndBroadcast?.()

    onStart()
  }, [onSignAndBroadcast, onStart])

  const confirmTranslation = useMemo(() => {
    return translate('common.signTransaction')
  }, [translate])

  const txStatusIndicator = useMemo(() => {
    if (status === TxStatus.Confirmed) {
      return (
        <Center
          bg='background.success'
          boxSize='24px'
          borderRadius='full'
          color='text.success'
          fontSize='xs'
        >
          <FaCheck />
        </Center>
      )
    }

    if (status === TxStatus.Failed) {
      return (
        <Center
          bg='background.error'
          boxSize='24px'
          borderRadius='full'
          color='text.error'
          fontSize='xs'
        >
          <FaX />
        </Center>
      )
    }

    return (
      <CircularProgress
        isIndeterminate={status === TxStatus.Pending || (!isActionable && isActive && !status)}
        size='24px'
      />
    )
  }, [isActionable, isActive, status])

  if (!asset || !feeAsset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Text>{headerCopy}</Text>
        <Flex ml='auto' alignItems='center' gap={2}>
          {txId && (
            <Button as={Link} isExternal href={txIdLink} size='xs'>
              {translate('common.seeDetails')}
            </Button>
          )}
          {txStatusIndicator}
        </Flex>
      </CardHeader>
      {isActionable && (
        <Collapse in={isActive}>
          <CardBody display='flex' flexDir='column' gap={2}>
            <Button
              mx={-2}
              size='lg'
              colorScheme={status === TxStatus.Failed ? 'red' : 'blue'}
              onClick={handleSignTx}
              isDisabled={status === TxStatus.Failed}
              isLoading={isSubmitting}
            >
              {confirmTranslation}
            </Button>
          </CardBody>
        </Collapse>
      )}
    </Card>
  )
}
