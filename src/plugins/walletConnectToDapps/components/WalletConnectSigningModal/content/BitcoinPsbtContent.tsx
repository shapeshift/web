import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { Psbt } from '@shapeshiftoss/bitcoinjs-lib'
import { btcChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { fromBaseUnit } from '@/lib/math'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BitcoinPsbtContentProps = {
  psbt: string
  broadcast?: boolean
}

export const BitcoinPsbtContent: FC<BitcoinPsbtContentProps> = ({ psbt, broadcast }) => {
  const translate = useTranslate()
  const sectionBorderColor = useColorModeValue('gray.100', 'whiteAlpha.100')
  const [isDetailExpanded, toggleIsDetailExpanded] = useToggle(false)

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, btcChainId))
  const networkIcon = useMemo(
    () => feeAsset?.networkIcon ?? feeAsset?.icon,
    [feeAsset?.networkIcon, feeAsset?.icon],
  )
  const precision = feeAsset?.precision ?? 8
  const symbol = feeAsset?.symbol ?? 'BTC'

  const parsed = useMemo(() => {
    try {
      return Psbt.fromBase64(psbt)
    } catch {
      return null
    }
  }, [psbt])

  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])

  if (!parsed) {
    const truncated = psbt.length > 200 ? `${psbt.substring(0, 200)}...` : psbt
    return (
      <Card borderRadius='2xl' p={4}>
        <RawText
          fontWeight='medium'
          color='text.subtle'
          wordBreak='break-all'
          fontSize='sm'
          fontFamily='mono'
        >
          {truncated}
        </RawText>
      </Card>
    )
  }

  return (
    <Card borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>
        {feeAsset && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2}>
              <RawText fontSize='sm' fontWeight='bold'>
                {feeAsset.networkName || feeAsset.name}
              </RawText>
              {networkIcon && <Image boxSize='20px' src={networkIcon} alt='' borderRadius='full' />}
            </HStack>
          </HStack>
        )}

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            Inputs
          </RawText>
          <RawText fontSize='sm' fontWeight='bold'>
            {parsed.txInputs.length}
          </RawText>
        </HStack>

        <HStack justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            Outputs
          </RawText>
          <RawText fontSize='sm' fontWeight='bold'>
            {parsed.txOutputs.length}
          </RawText>
        </HStack>

        {parsed.txOutputs.map((output, i) => (
          <HStack key={i} justify='space-between' align='center' py={1} pl={2}>
            {output.address ? (
              <InlineCopyButton value={output.address}>
                <MiddleEllipsis value={output.address} fontSize='xs' py={0} />
              </InlineCopyButton>
            ) : (
              <RawText fontSize='xs' color='text.subtle' fontFamily='mono'>
                {`Output ${i}`}
              </RawText>
            )}
            <Amount.Crypto
              value={fromBaseUnit(output.value.toString(), precision)}
              symbol={symbol}
              fontSize='xs'
              fontWeight='bold'
              whiteSpace='nowrap'
            />
          </HStack>
        ))}

        {broadcast !== undefined && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.sendTransaction.broadcast')}
            </RawText>
            <RawText fontSize='sm' fontWeight='bold'>
              {translate(broadcast ? 'common.yes' : 'common.no')}
            </RawText>
          </HStack>
        )}

        <Box borderTop='1px solid' borderColor={sectionBorderColor} pt={4} mt={2}>
          <Button
            variant='ghost'
            size='sm'
            p={0}
            h='auto'
            fontWeight='medium'
            justifyContent='space-between'
            onClick={toggleIsDetailExpanded}
            _hover={hoverStyle}
            w='full'
            mb={isDetailExpanded ? 3 : 0}
          >
            <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
              Raw PSBT
            </RawText>
            {isDetailExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          {isDetailExpanded && (
            <RawText fontSize='xs' fontFamily='mono' color='text.subtle' wordBreak='break-all'>
              {psbt}
            </RawText>
          )}
        </Box>
      </VStack>
    </Card>
  )
}
