import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Image from "@/models/Image";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!.trim(),
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!.trim(),
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!.trim(),
});

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const id = params.id;
        if (!id) {
            return NextResponse.json({ error: "Missing image ID" }, { status: 400 });
        }

        await connectToDatabase();
        const image = await Image.findById(id);

        if (!image) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        // Delete from ImageKit if fileId exists
        if (image.fileId) {
            try {
                await imagekit.deleteFile(image.fileId);
            } catch (ikError) {
                console.error("ImageKit Deletion Error:", ikError);
                // We'll continue to delete from DB even if IK deletion fails (e.g., file already gone)
            }
        }

        // Delete from MongoDB
        await Image.findByIdAndDelete(id);

        return NextResponse.json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error("Error deleting image:", error);
        return NextResponse.json(
            { error: "Failed to delete image" },
            { status: 500 }
        );
    }
}
