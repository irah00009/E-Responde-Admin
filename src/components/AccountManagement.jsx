import PoliceAccountManagement from './PoliceAccountManagement'
import UserAccountManagement from './UserAccountManagement'
import { useAccountType } from '../contexts/AccountTypeContext'
import './AccountManagement.css'

function AccountManagement() {
  const { accountType } = useAccountType()

  return (
    <div className="account-management-container">
      {accountType === 'civilian' ? (
        <UserAccountManagement />
      ) : (
        <PoliceAccountManagement />
      )}
    </div>
  )
}

export default AccountManagement
