// src/hooks/usePermissions.ts
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isOperationsManager: user?.role === 'operations_manager',
    isStaff: user?.role === 'staff',
    role: user?.role || null,
    userId: user?.id || null,
    user, // for convenience
  };
};
