import withAuth from "next-auth/middleware";
import { NextResponse } from "next/server";
//this always process each request which  help to tell to which page should user see without authorize
export default withAuth(
    function middleware() {
        return NextResponse.next()//each middle ware has next
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;


                //allow auth/public related routes
                if (
                    pathname.startsWith("/api/auth"),
                    pathname === "/login",
                    pathname === "/register",
                    pathname === "/" || pathname.startsWith("/api/images")

                ) {
                    return true;
                }

                return !!token
            }
        }
    }
)
//here  path where the middleware should learn
export const config = {
    matcher: ["/((?!_next|favicon.ico).*)"]
}