import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Image, { IImage } from "@/models/Image";

export async function GET() {
    try {
        await connectToDatabase();
        const images = await Image.find({}).sort({ createdAt: -1 }).lean();

        if (!images || images.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(images);
    } catch (error) {
        console.error("Error fetching pins:", error);
        return NextResponse.json(
            { error: "Failed to fetch pins" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const body: IImage = await request.json();

        // Validate required fields
        if (
            !body.title ||
            !body.description ||
            !body.imageUrl ||
            !body.fileId
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Create new image (pin) with default values
        const imageData = {
            ...body,
            userId: session.user.id,
            transformation: {
                height: 1500,
                width: 1000,
                quality: body.transformation?.quality ?? 100,
            },
        };

        console.log("Saving new pin for user:", session.user.id);
        const newImage = await Image.create(imageData);
        return NextResponse.json(newImage);
    } catch (error) {
        console.error("Error creating pin:", error);
        return NextResponse.json(
            { error: "Failed to create pin" },
            { status: 500 }
        );
    }
}
