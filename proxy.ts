import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/definitions', '/tags'];
const AUTH_PAGES = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ??
    request.cookies.get('__Secure-better-auth.session_token');

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL('/definitions', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/definitions/:path*', '/tags/:path*', '/login', '/register'],
};
