import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Image from "@/models/Image";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        await connectToDatabase();
        const pin = await Image.findById(id).lean();

        if (!pin) {
            return NextResponse.json({ error: "Pin not found" }, { status: 404 });
        }

        return NextResponse.json(pin);
    } catch (error) {
        console.error("Error fetching pin:", error);
        return NextResponse.json(
            { error: "Failed to fetch pin" },
            { status: 500 }
        );
    }
}
