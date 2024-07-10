import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  ModalBody,
  ModalHeader,
  Tooltip,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { reloadWebview } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { selectWalletAccountIds } from 'state/slices/selectors'
import { txHistory, txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { persistor, useAppDispatch, useAppSelector } from 'state/store'

type ClearCacheProps = {
  appHistory: RouteComponentProps['history']
}

const arrowBackIcon = <ArrowBackIcon />

const ClearCacheButton = ({
  label,
  tooltipText,
  onClick,
}: {
  label: string
  tooltipText: string
  onClick: () => void
}) => {
  return (
    <Button mb={2} width='full' justifyContent='flexStart' pl={8} variant='ghost' onClick={onClick}>
      <Flex alignItems='center' textAlign='left'>
        <Flex ml={4}>
          <RawText>{label}</RawText>
          <Tooltip label={tooltipText}>
            <Box ml={1}>
              <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
            </Box>
          </Tooltip>
        </Flex>
      </Flex>
    </Button>
  )
}

export const ClearCache = ({ appHistory }: ClearCacheProps) => {
  const dispatch = useAppDispatch()
  const requestedAccountIds = useAppSelector(selectWalletAccountIds)
  const translate = useTranslate()
  const history = useHistory()
  const { disconnect } = useWallet()
  const { goBack } = history

  const handleClearCacheClick = useCallback(async () => {
    try {
      // First disconnect the wallet so the mobile users won't be asked for a password
      disconnect()
      // clear store
      await persistor.purge()
      // send them back to the connect wallet route in case the bug was something to do with the current page
      // and so they can reconnect their native wallet to avoid the app looking broken in an infinite loading state
      appHistory.replace('/connect-wallet')
      // reload the page
      isMobileApp ? reloadWebview() : window.location.reload()
    } catch (e) {}
  }, [appHistory, disconnect])

  const handleClearTxHistory = useCallback(() => {
    dispatch(txHistory.actions.clear())
    dispatch(txHistoryApi.util.resetApiState())
    dispatch(txHistoryApi.endpoints.getAllTxHistory.initiate(requestedAccountIds))
  }, [dispatch, requestedAccountIds])

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={goBack}
      />
      <ModalHeader textAlign='center'>{translate('modals.settings.clearCache')}</ModalHeader>
      <>
        <ModalBody
          alignItems='center'
          justifyContent='center'
          textAlign='center'
          maxHeight='400'
          overflowY='auto'
          overflowX='hidden'
        >
          <ClearCacheButton
            label={translate('modals.settings.clearCache')}
            tooltipText={translate('modals.settings.clearCacheTooltip')}
            onClick={handleClearCacheClick}
          />
          <ClearCacheButton
            label={translate('modals.settings.clearTxHistory')}
            tooltipText={translate('modals.settings.clearTxHistoryTooltip')}
            onClick={handleClearTxHistory}
          />
        </ModalBody>
      </>
    </SlideTransition>
  )
}
