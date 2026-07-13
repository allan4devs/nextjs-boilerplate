export default function ImageTile({
  src,
  alt,
  className = "",
  fit = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  return (
    <div className={`overflow-hidden bg-neutral-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full transition duration-500 hover:scale-105 ${
          fit === "contain" ? "object-contain" : "object-cover"
        }`}
      />
    </div>
  );
}
