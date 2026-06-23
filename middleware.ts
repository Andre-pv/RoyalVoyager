import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin-only routes
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // User-only routes (must be logged in)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/voyage')) {
      if (!token) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Admin and dashboard require auth
        if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/voyage')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/voyage/:path*'],
};
