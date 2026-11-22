import { redirect } from 'next/navigation';
import { getUser } from '@/lib/server';
import AuthScreen from '@/components/auth-screen';
export default async function Register() {
  const user = await getUser();
  if (user) redirect(`/${user.role}/overview`);
  return <AuthScreen mode="register" />;
}
