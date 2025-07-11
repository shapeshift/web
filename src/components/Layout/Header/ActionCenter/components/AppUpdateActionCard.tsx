import { Button, Image, useDisclosure } from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCard } from './ActionCard'

import UpdateIcon from '@/assets/update-icon.svg'
import { Text } from '@/components/Text/Text'
import { formatSmartDate } from '@/lib/utils/time'
import type { AppUpdateAction } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

type AppUpdateActionCardProps = {
  action: AppUpdateAction
}

export const AppUpdateActionCard = ({ action }: AppUpdateActionCardProps) => {
  const translate = useTranslate()

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })

  const formattedDate = useMemo(() => {
    return formatSmartDate(action.updatedAt)
  }, [action.updatedAt])

  const handleUpdate = useCallback(() => {
    window.location.reload()
  }, [])

  const icon = useMemo(() => {
    return <Image src={UpdateIcon} />
  }, [])

  const description = useMemo(() => {
    return <Text fontSize='sm' translation='updateToast.body' />
  }, [])

  return (
    <ActionCard
      type={action.type}
      formattedDate={formattedDate}
      isCollapsable={true}
      isOpen={isOpen}
      onToggle={onToggle}
      description={description}
      icon={icon}
    >
      <Button size='sm' onClick={handleUpdate} width='full'>
        {translate('updateToast.cta')}
      </Button>
    </ActionCard>
  )
}
