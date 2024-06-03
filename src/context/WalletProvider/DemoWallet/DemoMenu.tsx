import { ManageAccountsMenuItem } from 'components/Layout/Header/NavBar/ManageAccountsMenuItem'

type DemoMenuProps = {
  onClose?: () => void
}

export const DemoMenu: React.FC<DemoMenuProps> = ({ onClose }) => {
  return <ManageAccountsMenuItem displayDivider={true} onClose={onClose} />
}
