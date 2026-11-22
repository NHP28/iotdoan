'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-[1.5rem] min-h-[100vh] flex items-center justify-center">
      <div className="p-[1.35rem] rounded-[var(--radius-lg)] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.85rem] bg-none bg-[var(--bg-surface)] [box-shadow:var(--shadow-hard)] max-w-[460px] text-center flex flex-col items-center">
        <span className="inline-block text-[0.7rem] font-medium tracking-[0.1em] uppercase text-[var(--ink-muted)] mb-[0.35rem]">
          DRIVERHUB / KẾT NỐI
        </span>
        <h1 className="m-[0] font-medium text-[1.55rem]">Máy chủ chưa sẵn sàng</h1>
        <p className="m-[0] text-[var(--ink-secondary)] text-[0.9rem]">
          Vui lòng kiểm tra backend, kết nối MySQL và cấu hình BACKEND_URL, sau đó thử lại.
        </p>
        <button
          className="px-[1.15rem] py-[0.65rem] rounded-[10px] border-[2px] border-solid [border-color:var(--border-strong)] gap-[0.5rem] bg-none [font-family:inherit] text-[0.84rem] font-medium leading-[inherit] [font-style:inherit] [font-variant:inherit] text-[#11141c] cursor-pointer inline-flex items-center justify-center [transition:transform_0.12s_ease,_box-shadow_0.12s_ease,_background-color_0.15s_ease] whitespace-nowrap bg-[var(--primary)] [box-shadow:var(--shadow-hard-sm)] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.55] [&:not(:disabled):hover]:[transform:translate(-1px,_-1px)] [&:not(:disabled):hover]:bg-[var(--primary-strong)] [&:not(:disabled):hover]:[box-shadow:var(--shadow-hard)] [&:not(:disabled):active]:[transform:translate(1px,_1px)]! [&:not(:disabled):active]:[box-shadow:none]!"
          onClick={reset}
        >
          Thử kết nối lại
        </button>
        <a className="text-inherit [font-size:inherit] no-underline" href="/login">
          Về trang đăng nhập
        </a>
      </div>
    </main>
  );
}
