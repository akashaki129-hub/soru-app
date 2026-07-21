import soruIcon from "@/assets/brand/soru-icon.png";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={soruIcon}
        alt="Soru logo"
        width={48}
        height={48}
        className="size-11 shrink-0 rounded-2xl object-contain shadow-sm"
      />
      <span className="text-2xl font-extrabold tracking-[-0.045em]">Soru</span>
    </span>
  );
}
