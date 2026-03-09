'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <div className='min-h-screen flex flex-col'>
      <nav className='border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-4'>
        <div className='flex items-center gap-6'>
          <Link href='/definitions' className='text-lg font-semibold text-gray-900'>
            📖 Arabic Dict
          </Link>
          <div className='flex items-center gap-4 text-sm'>
            <Link
              href='/definitions'
              className={`font-medium transition-colors ${
                pathname.startsWith('/definitions')
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Definitions
            </Link>
            <Link
              href='/tags'
              className={`font-medium transition-colors ${
                pathname === '/tags' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tags
            </Link>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className='text-sm text-gray-500 hover:text-gray-800 transition-colors'
        >
          Sign out
        </button>
      </nav>
      <main className='flex-1 bg-gray-50'>{children}</main>
    </div>
  );
}
