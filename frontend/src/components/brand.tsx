import { Route } from 'lucide-react';
import Link from 'next/link';
export default function Brand({ href = '/' }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="DriverHub - Trang chủ"><span className="brand-mark"><Route size={24} strokeWidth={2.4} /></span><span>driver<span className="brand-light">hub</span><span className="brand-dot">.</span></span></Link>;
}
