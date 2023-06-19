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
 * full example url http://localhost:3000/#/dashboard/yat?eid=%F0%9F%A6%8A%F0%9F%9A%80%F0%9F%8C%88
 */
export const YatModal: React.FC<YatModalProps> = ({ eid }) => {
  const [maybeYatEthAddress, setMaybeYatEthAddress] = useState<string | null>(null)
  const [maybeYatUsdcAddress, setMaybeYatUsdcAddress] = useState<string | null>(null)
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
    /**
     * unlike ENS names, yat's can be associated with multiple addresses by asset
     * namely, eth address and the usdc address
     */
    type YatResolution = {
      assetId: AssetId
      setter: React.Dispatch<React.SetStateAction<string | null>>
    }

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
    resolutionPaths.forEach(async ({ assetId, setter }) => {
      // this isn't *really* async and doesn't make network requests
      // so ok to validate the same eid twice here
      const isValidYat = await validateYat({ maybeAddress: eid })
      if (!isValidYat) return
      const maybeResolvedAddress = await resolveYat({ assetId, maybeAddress: eid })
      // can return empty string
      // TODO(0xdef1cafe): abuse the difference between null and empty string as a loading state
      if (!maybeResolvedAddress) return
      setter(maybeResolvedAddress)
    })
  }, [eid])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>YatModal</ModalHeader>
        <ModalBody>
          yat emojis: {eid}
          yat usdc address: {maybeYatUsdcAddress}
          yat eth address: {maybeYatEthAddress}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
