import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Center, Heading, Stack } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransitionY } from 'components/SlideTransitionY'

type StatusBodyProps = {
  txStatus: TxStatus
  children?: JSX.Element | null
}

const pendingIcon = <CircularProgress size='24' />
const confirmedIcon = <CheckCircleIcon color='text.success' boxSize='24' />
const failedIcon = <WarningTwoIcon color='red.500' boxSize='24' />

export const StatusBody = ({ txStatus, children }: StatusBodyProps) => {
  const translate = useTranslate()

  const { title, icon } = useMemo(() => {
    switch (txStatus) {
      case TxStatus.Pending:
        return { title: translate('pools.waitingForConfirmation'), icon: pendingIcon }
      case TxStatus.Confirmed:
        return { title: translate('common.success'), icon: confirmedIcon }
      case TxStatus.Failed:
        return { title: translate('common.somethingWentWrong'), icon: failedIcon }
      case TxStatus.Unknown:
      default:
        return { title: '', icon: null }
    }
  }, [txStatus, translate])

  if (txStatus === TxStatus.Unknown) {
    return null
  }

  return (
    <SlideTransitionY key={txStatus}>
      <Center flexDir='column' gap={4}>
        {icon}
        <Stack spacing={2} alignItems='center'>
          <Heading as='h4'>{title}</Heading>
          {Boolean(children) && children}
        </Stack>
      </Center>
    </SlideTransitionY>
  )
}
