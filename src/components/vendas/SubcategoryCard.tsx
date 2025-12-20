import { Card } from "@/components/ui/card";
import { Package, ChevronRight } from "lucide-react";
import { playClickSound } from "@/hooks/useClickSound";

interface SubcategoryCardProps {
  name: string;
  minPrice: number;
  onClick: () => void;
}

export function SubcategoryCard({ name, minPrice, onClick }: SubcategoryCardProps) {
  const handleClick = () => {
    playClickSound();
    onClick();
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      data-sound-local="1"
      className="p-4 cursor-pointer hover:shadow-lg hover:border-hover/50 hover:bg-hover/10 transition-all flex flex-col min-h-[120px]"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
      </div>
      <h3 className="font-semibold text-sm line-clamp-2 flex-1">{name}</h3>
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="text-xs text-muted-foreground">a partir de</span>
          <p className="text-primary font-bold text-sm">R$ {minPrice.toFixed(2)}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </Card>
  );
}
