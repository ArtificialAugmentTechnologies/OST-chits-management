const logoAsset = { url: "/images/OST_logo_circle.png" };

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup flex items-center gap-2.5">
      <img src={logoAsset.url} alt="OST — Om Sakthi Tex" className="h-10 w-10 shrink-0 object-contain" />
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold text-primary">OST Chits</p>
          <p className="text-[11px] text-accent-foreground">Customer Portal</p>
        </div>
      )}
    </div>
  );
}

export function CreatedBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] text-muted-foreground ${className}`}>
      Created by <span className="font-semibold text-primary">Artificial Augment Technologies</span>
    </p>
  );
}
