import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'
import { resolveYat, validateYat } from 'lib/address/yat'

type YatModalProps = {
  // https://a.y.at/emoji_id/%F0%9F%A6%8A%F0%9F%9A%80%F0%9F%8C%88 for example
  // which is 🦊🚀🌈 without URL encoding
  eid: string
}

/**
 * see https://github.com/shapeshift/web/issues/4604
 * this modal is used to handle when a user successfully purchases a yat
 *
 * the app (including mobile app) will redirect to /yat?eid=<idOfPurchasedYat>
 * full example url http://localhost:3000/#/dashboard?eid=%F0%9F%A6%8A%F0%9F%9A%80%F0%9F%8C%88
 */
export const YatModal: React.FC<YatModalProps> = ({ eid }) => {
  // nulls here are the "loading" state
  const [maybeYatEthAddress, setMaybeYatEthAddress] = useState<string | null>(null)
  const [maybeYatUsdcAddress, setMaybeYatUsdcAddress] = useState<string | null>(null)
  const [isValidYat, setIsValidYat] = useState<boolean>(false)
  const translate = useTranslate()
  const { history, location } = useBrowserRouter()
  const { yat: yatModal } = useModal()
  const { close } = yatModal
  const isOpen = Boolean(eid)
  console.log('YatModal', { eid, isOpen })

  const handleClose = useCallback(() => {
    // remove the query param from the route so we don't immediately re-open the modal
    history.replace({ pathname: location.pathname })
    // close the modal
    close()
  }, [close, history, location.pathname])

  /**
   * this logic is here in the modal rather than the context
   * so it's not spamming yat api on every render cycle
   */
  useEffect(() => {
    if (!eid) return
    type YatResolution = {
      assetId: AssetId
      setter: React.Dispatch<React.SetStateAction<string | null>>
    }

    /**
     * unlike ENS names, yat's can be associated with multiple addresses by asset
     * namely, eth address and the usdc address
     */
    const resolutionPaths: YatResolution[] = [
      {
        assetId: ethAssetId,
        setter: setMaybeYatEthAddress,
      },
      {
        assetId: usdcAssetId,
        setter: setMaybeYatUsdcAddress,
      },
    ]

    ;(async () => {
      const isValidYat = await validateYat({ maybeAddress: eid })
      if (isValidYat) {
        setIsValidYat(true)
      } else {
        console.log('YatModal - invalid eid', eid)
        handleClose()
      }

      resolutionPaths.forEach(async ({ assetId, setter }) => {
        /**
         * resolveYat can return empty string (nothing resolved/attached), or an address.
         * we set the returned value regardless, empty string becomes the "loaded" state
         */
        setter(await resolveYat({ assetId, maybeAddress: eid }))
      })
    })()
  }, [eid, handleClose])

  if (!isValidYat) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>{translate('features.yat.modal.title')}</ModalHeader>
        <ModalBody>
          <div>yat emojis: {eid}</div>
          <div>
            yat usdc address:{' '}
            <pre>
              {maybeYatUsdcAddress === null
                ? 'loading'
                : maybeYatUsdcAddress === ''
                ? 'no usdc addy'
                : maybeYatUsdcAddress}
            </pre>
          </div>
          <div>
            yat eth address:{' '}
            {maybeYatEthAddress === null
              ? 'loading'
              : maybeYatEthAddress === ''
              ? 'no eth addy'
              : maybeYatEthAddress}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
