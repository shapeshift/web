import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Collapse,
  Flex,
  HStack,
  Icon,
  Link,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'
import { getTxLink } from '@/lib/getTxLink'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
  textDecoration: 'none',
}

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
}

export const GenericTransactionActionCard = ({ action }: GenericTransactionActionCardProps) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, action.chainId))

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(action.updatedAt)
    const sevenDaysAgo = now.subtract(7, 'day')
    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [action.updatedAt])

  const txLink = useMemo(() => {
    if (!feeAsset) return

    return getTxLink({
      txId: action.txHash,
      chainId: action.chainId,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })
  }, [action.txHash, action.chainId, feeAsset])

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false })

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={hoverProps}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4} onClick={onToggle}>
        <AssetIconWithBadge assetId={action.assetId} size='md'>
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack width='full'>
            <Stack spacing={1} width='full'>
              <RawText fontSize='sm' fontWeight={500} lineHeight='short'>
                {action.message}
              </RawText>
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1} align='center'>
                <ActionStatusTag status={action.status} />
                <RawText>{formattedDate}</RawText>
                <RawText>{action.displayType}</RawText>
              </HStack>
            </Stack>
            <Icon
              as={isOpen ? ChevronUpIcon : ChevronDownIcon}
              ml='auto'
              my='auto'
              fontSize='xl'
              color='text.subtle'
            />
          </HStack>
          {txLink && (
            <Collapse in={isOpen}>
              <Card bg='transparent' mt={4} boxShadow='none'>
                <CardBody px={0} py={0}>
                  <Stack gap={4}>
                    <ButtonGroup width='full' size='sm'>
                      <Button width='full' as={Link} isExternal href={txLink}>
                        {translate('notificationCenter.viewTransaction')}
                      </Button>
                    </ButtonGroup>
                  </Stack>
                </CardBody>
              </Card>
            </Collapse>
          )}
        </Stack>
      </Flex>
    </Stack>
  )
}
