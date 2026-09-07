import type { PhotoTile } from "@/lib/providers/photos";

export function PhotoGallery({ tiles, name, subtitle, badge = "Illustrative" }: { tiles: PhotoTile[]; name: string; subtitle?: string; badge?: string }) {
  return (
    <div className="relative">
      <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto">
        {tiles.map((tile, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={tile.url} alt={tile.alt} className="h-56 w-full flex-none snap-start object-cover" />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-10">
        <p className="text-[19px] font-bold leading-tight text-white">{name}</p>
        {subtitle && <p className="text-[13px] text-white/75">{subtitle}</p>}
      </div>
      <p className="absolute right-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[10.5px] font-semibold text-white/85">{badge}</p>
    </div>
  );
}
