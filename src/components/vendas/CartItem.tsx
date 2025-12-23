import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { OrderItem } from "@/lib/types";

interface CartItemProps {
  item: OrderItem;
  onRemove: () => void;
}

export function CartItem({ item, onRemove }: CartItemProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-sm leading-tight break-words">{item.name}</div>
        {item.variationName && (
          <div className="text-xs text-muted-foreground leading-tight break-words">{item.variationName}</div>
        )}
        {item.dimensions && (
          <div className="text-xs text-muted-foreground">Medidas: {item.dimensions}</div>
        )}
        {item.finishing && (
          <div className="text-xs text-primary font-medium leading-tight break-words">Acab: {item.finishing}</div>
        )}
        {item.customDescription && (
          <div className="text-xs text-muted-foreground leading-tight break-words bg-muted/50 px-2 py-1 rounded mt-1">
            <span className="font-medium">OBS:</span> {item.customDescription}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-muted-foreground">{item.quantity}x</span>
          <span className="text-xs text-muted-foreground">
            R$ {(item.total / item.quantity).toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="font-bold text-primary whitespace-nowrap">R$ {item.total.toFixed(2)}</span>
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
