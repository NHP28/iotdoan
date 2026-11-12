import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/server';
import { sections } from '@/lib/types';
export default async function WorkspaceRoot({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!Object.hasOwn(sections, role)) notFound();
  const user = await getUser();
  redirect(user ? `/${user.role}/overview` : '/login');
}
