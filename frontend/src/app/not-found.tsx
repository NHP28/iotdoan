import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="p-[1.5rem] min-h-[100vh] flex items-center justify-center">
      <div className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.85rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] max-w-[460px] text-center flex flex-col items-center">
        <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
          404 / DRIVERHUB
        </span>
        <h1 className="m-[0] font-medium text-[1.55rem]">Không tìm thấy trang</h1>
        <p className="m-[0] text-[var(--ink-secondary)] text-[0.9rem]">
          Trang bạn đang tìm không tồn tại hoặc không thuộc quyền truy cập của bạn.
        </p>
        <Link
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none text-[#11141c] no-underline inline-flex items-center justify-center text-[0.84rem] font-medium [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          href="/"
        >
          Về trang tổng quan
        </Link>
      </div>
    </main>
  );
}
