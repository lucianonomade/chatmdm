import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { OrderItem } from "@/lib/types";

interface CartItemProps {
  item: OrderItem;
  onRemove: () => void;
}

export function CartItem({ item, onRemove }: CartItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{item.name}</div>
        {item.variationName && (
          <div className="text-xs text-muted-foreground truncate">{item.variationName}</div>
        )}
        {item.dimensions && (
          <div className="text-xs text-muted-foreground">Medidas: {item.dimensions}</div>
        )}
        {item.finishing && (
          <div className="text-xs text-primary font-medium truncate">Acab: {item.finishing}</div>
        )}
        {item.customDescription && (
          <div className="text-xs text-muted-foreground truncate">Obs: {item.customDescription}</div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{item.quantity}x</span>
          <span className="text-xs text-muted-foreground">
            R$ {(item.total / item.quantity).toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-bold text-primary">R$ {item.total.toFixed(2)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
