'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp } from '@/lib/auth-client';

type Mode = 'login' | 'register';
type OAuthProvider = 'google' | 'github';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    if (mode === 'register') {
      const name = data.get('name') as string;
      await signUp.email(
        { email, password, name },
        {
          onSuccess: () => router.push('/definitions'),
          onError: (ctx) => setError(ctx.error.message),
        },
      );
    } else {
      await signIn.email(
        { email, password },
        {
          onSuccess: () => router.push('/definitions'),
          onError: (ctx) => setError(ctx.error.message),
        },
      );
    }

    setLoading(false);
  }

  async function handleOAuth(provider: OAuthProvider) {
    await signIn.social({ provider, callbackURL: '/definitions' });
  }

  function handleGoogleSignIn() {
    handleOAuth('google');
  }

  function handleGitHubSignIn() {
    handleOAuth('github');
  }

  const isRegister = mode === 'register';

  return (
    <main className='min-h-screen grid place-items-center bg-gray-50 px-4'>
      <div className='w-full max-w-sm space-y-6'>
        <header className='text-center space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight text-gray-900'>
            {isRegister ? 'Create account' : 'Sign in'}
          </h1>
          <p className='text-sm text-gray-500'>
            {isRegister ? 'Already have an account? ' : 'Don\u2019t have an account? '}
            <Link
              href={isRegister ? '/login' : '/login?mode=register'}
              className='font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded'
            >
              {isRegister ? 'Sign in' : 'Create account'}
            </Link>
          </p>
        </header>

        <section aria-label='Sign in with a provider' className='space-y-2'>
          <button
            type='button'
            onClick={handleGoogleSignIn}
            className='w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors'
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            type='button'
            onClick={handleGitHubSignIn}
            className='w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors'
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </section>

        <div role='separator' className='relative flex items-center gap-3'>
          <div className='h-px flex-1 bg-gray-200' />
          <span className='text-xs text-gray-400'>or</span>
          <div className='h-px flex-1 bg-gray-200' />
        </div>

        <form onSubmit={handleSubmit} className='space-y-4' noValidate>
          {isRegister && (
            <div className='space-y-1'>
              <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
                Name
              </label>
              <input
                id='name'
                name='name'
                type='text'
                autoComplete='name'
                required
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
              />
            </div>
          )}

          <div className='space-y-1'>
            <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
              Email
            </label>
            <input
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              required
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            />
          </div>

          <div className='space-y-1'>
            <label htmlFor='password' className='block text-sm font-medium text-gray-700'>
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            />
          </div>

          {error && (
            <p role='alert' aria-live='polite' className='text-sm text-red-600'>
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={loading}
            aria-busy={loading}
            className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? 'Please wait\u2026' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' className='size-4 shrink-0'>
      <path
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
        fill='#4285F4'
      />
      <path
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
        fill='#34A853'
      />
      <path
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
        fill='#FBBC05'
      />
      <path
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
        fill='#EA4335'
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      aria-hidden='true'
      focusable='false'
      className='size-4 shrink-0 fill-current'
    >
      <path d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
