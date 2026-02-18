import { IKImage } from "imagekitio-next";
import Link from "next/link";
import { IImage } from "@/models/Image"

export default function ImageComponent({ image }: { image: IImage }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-primary/50 transition-colors">
      <Link href={`/images/${image._id}`} className="block relative aspect-[2/3]">
        <IKImage
          path={image.imageUrl}
          alt={image.title}
          transformation={[{ height: "1500", width: "1000" }]}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="btn btn-primary btn-sm rounded-lg">View Pin</span>
        </div>
      </Link>

      <div className="p-4 space-y-2">
        <Link href={`/images/${image._id}`} className="block">
          <h2 className="text-lg font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">
            {image.title}
          </h2>
        </Link>
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
          {image.description}
        </p>
      </div>
    </div>
  );
}