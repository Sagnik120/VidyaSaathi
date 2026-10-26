import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth';
import { isStaff } from '@/lib/staff';
import { Landing } from '@/components/landing/landing';

/** Signed-in people go straight to their classroom; everyone else gets the welcome page. */
export default function Index() {
  const { signedIn, user } = useAuth();
  if (signedIn) return <Redirect href={isStaff(user) ? '/admin' : '/dashboard'} />;
  return <Landing />;
}
