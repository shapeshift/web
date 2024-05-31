import { AccountsManagementMenuItem } from 'components/Layout/Header/NavBar/AccountsManagementMenuItem'

type KeepKeyConnectedMenuItemsProps = {
  onClose?: () => void
}

export const KeepKeyConnectedMenuItems: React.FC<KeepKeyConnectedMenuItemsProps> = ({
  onClose,
}) => {
  return (
    <>
      <AccountsManagementMenuItem displayDivider={true} onClose={onClose} />
    </>
  )
}
