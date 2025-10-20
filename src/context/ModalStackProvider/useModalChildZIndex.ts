import { useMemo } from 'react'

import { ZINDEX_BUFFER } from './constants'
import { useModalStack } from './ModalStackProvider'

/**
 * Hook for child components (like dropdowns, menus, popovers) that need to render
 * above the current modal in the stack. This is useful for components that use Portal
 * and need to be aware of the modal stack to render at the correct z-index level.
 *
 * @returns A z-index value to use for portaled content, or 'modal' if not in a modal stack
 */
export const useModalChildZIndex = () => {
  const { getHighestModal, getZIndex } = useModalStack()

  const zIndexValue = useMemo(() => {
    const highestModal = getHighestModal()
    if (!highestModal) return 'modal'

    const zIndex = getZIndex(highestModal.id)
    if (zIndex === undefined) return 'modal'

    // Child content should be above the modal content
    // Modal content is at: calc(var(--chakra-zIndices-modal) + ${zIndex + ZINDEX_BUFFER})
    // So we add 1 more to be above it
    return `calc(var(--chakra-zIndices-modal) + ${zIndex + ZINDEX_BUFFER + 1})`
  }, [getHighestModal, getZIndex])

  return zIndexValue
}
