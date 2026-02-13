import { authOptions } from "@/lib/auth"
import NextAuth from "next-auth"

//Making handler

const handler=NextAuth(authOptions)

export {handler as GET,handler as POST}