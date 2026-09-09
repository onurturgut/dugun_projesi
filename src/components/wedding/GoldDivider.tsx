export function GoldDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/60 sm:w-20" />
      <span className="text-[0.6rem] text-gold">✦</span>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/60 sm:w-20" />
    </div>
  );
}
