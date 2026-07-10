import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@irene/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await refreshSession(request);

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
