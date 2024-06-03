import { ManageAccountsMenuItem } from 'components/Layout/Header/NavBar/ManageAccountsMenuItem'

type KeepKeyConnectedMenuItemsProps = {
  onClose?: () => void
}

export const KeepKeyConnectedMenuItems: React.FC<KeepKeyConnectedMenuItemsProps> = ({
  onClose,
}) => {
  return (
    <>
      <ManageAccountsMenuItem displayDivider={true} onClose={onClose} />
    </>
  )
}
