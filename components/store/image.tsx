/* eslint-disable @next/next/no-img-element -- This renderer uses pre-generated WebP srcsets and exact SVG reference crops. */
import { CSSProperties } from "react";
import { Crop } from "@/lib/catalog";
import { categoryImages } from "@/lib/imagery";

type SourceImageProps = {
  crop: Crop;
  alt?: string;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
  sizes?: string;
};

export function SourceImage({
  crop,
  alt = "",
  className = "",
  priority = false,
  style,
  sizes = "(max-width:700px) 88vw, 60vw",
}: SourceImageProps) {
  const full =
    crop.x === 0 && crop.y === 0 && crop.cw === crop.w && crop.ch === crop.h;
  const responsive = crop.src.startsWith("hd/");
  return (
    <span
      className={`source-image ${className}`}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      style={{ aspectRatio: `${crop.cw}/${crop.ch}`, ...style }}
    >
      {full ? (
        <img
          src={`/assets/${crop.src}`}
          srcSet={
            responsive
              ? `/assets/${crop.src.replace(".webp", "-512.webp")} 512w, /assets/${crop.src} ${crop.w}w`
              : undefined
          }
          sizes={sizes}
          alt=""
          width={crop.w}
          height={crop.h}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      ) : (
        <svg
          viewBox={`${crop.x} ${crop.y} ${crop.cw} ${crop.ch}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <image
            href={`/assets/${crop.src}`}
            x="0"
            y="0"
            width={crop.w}
            height={crop.h}
          />
        </svg>
      )}
    </span>
  );
}

export function Model({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  return (
    <span className={`model-cutout ${className}`}>
      <img
        src={`/assets/hd/${categoryImages[index]}.webp`}
        srcSet={`/assets/hd/${categoryImages[index]}-512.webp 512w, /assets/hd/${categoryImages[index]}.webp 1024w`}
        sizes="(max-width:700px) 60vw, 20vw"
        width={1024}
        height={1536}
        alt={`${["Streetwear", "Formal", "Casual", "Outerwear", "Layered"][index]} collection model`}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
