import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/server';
import { sections, Role } from '@/lib/types';
import Workspace from '@/components/workspace';
export default async function WorkspacePage({ params }: { params: Promise<{ role: string; section: string }> }) {
  const { role, section } = await params;
  if (!Object.hasOwn(sections, role) || !sections[role as Role].includes(section)) notFound();
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.role !== role) redirect(`/${user.role}/overview`);
  return <Workspace user={user} section={section} />;
}
