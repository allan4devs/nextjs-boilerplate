import Image from "next/image";

export default function ImageTile({
  src,
  alt,
  className = "",
  fit = "cover",
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-neutral-900 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={76}
        className={`transition duration-500 hover:scale-105 ${
          fit === "contain" ? "object-contain" : "object-cover"
        }`}
      />
    </div>
  );
}
