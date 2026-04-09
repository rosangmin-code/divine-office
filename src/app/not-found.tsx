import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 h-10 w-10 text-stone-400 dark:text-stone-500" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <h2 className="mb-2 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Хуудас олдсонгүй
        </h2>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          Хайсан хуудас байхгүй байна.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-stone-200 px-6 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
        >
          Нүүр хуудас руу буцах
        </Link>
      </div>
    </div>
  )
}
