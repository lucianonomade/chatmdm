import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Product } from "@/lib/types";
import { playClickSound } from "@/hooks/useClickSound";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const minPrice = product.variations && product.variations.length > 0
    ? Math.min(...product.variations.map(v => v.price))
    : product.price;

  const handleClick = () => {
    playClickSound();
    onClick();
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      data-sound-local="1"
      className="p-3 cursor-pointer hover:shadow-lg hover:border-hover/50 hover:bg-hover/10 transition-all flex flex-col min-h-[120px]"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <span className="text-xs text-muted-foreground uppercase truncate">
        {product.subcategory || product.category}
      </span>
      <h3 className="font-semibold text-sm mt-1 line-clamp-2 flex-1">{product.name}</h3>
      <div className="flex items-center justify-between mt-2">
        <div className="min-w-0 flex-1">
          {product.variations && product.variations.length > 0 && (
            <span className="text-xs text-muted-foreground block">a partir de</span>
          )}
          <p className="text-primary font-bold text-sm truncate">
            R$ {minPrice.toFixed(2)}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 ml-2">
          <Plus className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
