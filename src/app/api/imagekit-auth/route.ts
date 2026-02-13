import ImageKit from "imagekit";
import { NextResponse } from "next/server";

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!.trim(),
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!.trim(),
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!.trim(),
});

export async function GET() {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        return NextResponse.json(authenticationParameters);
    } catch (error) {
        console.error("ImageKit Auth Error:", error);
        return NextResponse.json(
            { error: "ImageKit Authentication Failed" },
            { status: 500 }
        );
    }
}