import { Route } from 'lucide-react';
import Link from 'next/link';
export default function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="text-inherit gap-[0.65rem] [font-size:inherit] no-underline inline-flex items-center text-[1.25rem] font-medium tracking-[-0.02em]"
      aria-label="DriverHub - Trang chủ"
    >
      <span className="rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] bg-none inline-flex items-center justify-center w-[38px] h-[38px] bg-[var(--primary)] text-[#11141c] [box-shadow:var(--shadow-hard-sm)]">
        <Route size={24} strokeWidth={2.4} />
      </span>
      <span>
        driver
        <span className="font-medium">hub</span>
        <span className="text-[var(--brand)]">.</span>
      </span>
    </Link>
  );
}
