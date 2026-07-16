import soruIcon from "@/assets/brand/soru-icon.png";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={soruIcon} alt="" width={40} height={40} className="size-9 object-contain" />
      <span className="text-xl font-extrabold tracking-[-0.04em]">Soru</span>
    </span>
  );
}
