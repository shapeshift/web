import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SettingsContent } from './SettingsContent'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from '@/hooks/useModal/useModal'

export const SettingsList: FC = () => {
  const translate = useTranslate()
  const settings = useModal('settings')
  const { navigate: browserNavigate } = useBrowserRouter()
  const [clickCount, setClickCount] = useState<number>(0)

  /**
   * tapping 5 times on the settings header will close this modal and take you to the flags page
   * useful for QA team and unlikely to be triggered by a regular user
   */
  const handleHeaderClick = useCallback(() => {
    if (clickCount === 4) {
      setClickCount(0)
      settings.close()
      browserNavigate('/flags')
    } else {
      setClickCount(clickCount + 1)
    }
  }, [clickCount, setClickCount, settings, browserNavigate])

  return (
    <SlideTransition>
      <DialogHeader textAlign='center' userSelect='none' onClick={handleHeaderClick}>
        <DialogHeaderMiddle> {translate('modals.settings.settings')} </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody alignItems='center' justifyContent='center' textAlign='center' pt={0} px={0}>
        <SettingsContent />
      </DialogBody>
    </SlideTransition>
  )
}
