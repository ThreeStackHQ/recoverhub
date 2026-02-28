import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth(function middleware(req) {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/connections") ||
    req.nextUrl.pathname.startsWith("/settings");
  const isOnAuth = req.nextUrl.pathname.startsWith("/auth/");

  if (isOnDashboard && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
