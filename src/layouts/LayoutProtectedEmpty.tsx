import { useFirebaseAuth } from '@ugrc/utah-design-system';
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import '../index.css';

export default function ProtectedLayoutEmpty() {
  const { currentUser } = useFirebaseAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <div className="w-full overflow-y-auto">
      <Outlet />
    </div>
  );
}
