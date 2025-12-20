import { Card } from "@/components/ui/card";
import { Palette, Printer, PenLine, MousePointer2, ImageIcon, LayoutGrid } from "lucide-react";
import { ReactNode } from "react";
import { playClickSound } from "@/hooks/useClickSound";

interface CategoryCardProps {
  category: string;
  itemCount: number;
  onClick: () => void;
}

const getCategoryIcon = (category: string): ReactNode => {
  const lower = category.toLowerCase();
  if (lower.includes('comunicação') || lower.includes('visual')) return <Palette className="h-8 w-8 text-purple-500" />;
  if (lower.includes('gráfica') || lower.includes('impressão')) return <Printer className="h-8 w-8 text-blue-500" />;
  if (lower.includes('papelaria')) return <PenLine className="h-8 w-8 text-amber-500" />;
  if (lower.includes('serviço')) return <MousePointer2 className="h-8 w-8 text-emerald-500" />;
  if (lower.includes('design') || lower.includes('arte')) return <ImageIcon className="h-8 w-8 text-pink-500" />;
  return <LayoutGrid className="h-8 w-8 text-slate-500" />;
};

export function CategoryCard({ category, itemCount, onClick }: CategoryCardProps) {
  const handleClick = () => {
    playClickSound();
    onClick();
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      data-sound-local="1"
      className="p-6 cursor-pointer hover:shadow-lg hover:border-hover/50 hover:bg-hover/10 transition-all flex flex-col items-center justify-center gap-3 min-h-[140px]"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
        {getCategoryIcon(category)}
      </div>
      <h3 className="font-semibold text-center truncate max-w-full">{category}</h3>
      <span className="text-xs text-muted-foreground">
        {itemCount} itens
      </span>
    </Card>
  );
}
