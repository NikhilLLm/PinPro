import { IImage } from "@/models/Image";
import ImageComponent from "./ImageComponent";

interface ImageFeedProps {
  images: IImage[];
}

export default function ImageFeed({ images }: ImageFeedProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <ImageComponent key={image._id?.toString()} image={image} />
      ))}

      {images.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-base-content/70">No pins found</p>
        </div>
      )}
    </div>
  );
}