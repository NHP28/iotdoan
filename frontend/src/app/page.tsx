import { redirect } from 'next/navigation';
import { getUser } from '@/lib/server';
export default async function Home() { const user = await getUser(); redirect(user ? `/${user.role}/overview` : '/login'); }
