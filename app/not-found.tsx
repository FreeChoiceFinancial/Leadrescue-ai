import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper">404</p>
      <h1 className="mt-3 font-display text-5xl">That page is not on the board.</h1>
      <Link href="/" className="btn btn-primary mt-6 w-fit">
        Back home
      </Link>
    </div>
  );
}
