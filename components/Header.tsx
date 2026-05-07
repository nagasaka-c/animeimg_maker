export default function Header() {
  return (
    <header className="w-full border-b border-border-soft bg-white">
      <div className="mx-auto max-w-5xl px-6 py-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="アニメーション画像制作ツール"
          className="h-9 w-auto max-w-full"
        />
      </div>
    </header>
  );
}
