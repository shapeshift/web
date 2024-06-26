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
import { deserializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { MultiStepStatusStep } from './SharedMultiStepStatus'

type TransactionRowProps = {
  assetId: AssetId
  onStart: () => void
  headerCopy: string | JSX.Element
  isActive?: boolean
  serializedTxIndex: string | undefined
} & Pick<MultiStepStatusStep, 'isActionable' | 'onSignAndBroadcast'>

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  headerCopy,
  onStart,
  isActive,
  isActionable,
  serializedTxIndex,
  onSignAndBroadcast,
}) => {
  const translate = useTranslate()

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex ?? ''))
  const status = useMemo(() => tx?.status, [tx?.status])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(assetId).chainId),
  )

  const txIdLink = useMemo(() => {
    if (!(asset && serializedTxIndex)) return
    const { txid } = deserializeTxIndex(serializedTxIndex)
    return getTxLink({
      defaultExplorerBaseUrl: asset.explorerTxLink,
      tradeId: txid,
      name: SwapperName.ArbitrumBridge,
    })
  }, [asset, serializedTxIndex])

  const handleSignTx = useCallback(async () => {
    if (!isActionable) return

    setIsSubmitting(true)

    await onSignAndBroadcast!()

    onStart()
  }, [isActionable, onSignAndBroadcast, onStart])

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
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center' flexWrap='wrap'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Text>{headerCopy}</Text>
        <Flex ml='auto' alignItems='center' gap={2}>
          {txIdLink && (
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
