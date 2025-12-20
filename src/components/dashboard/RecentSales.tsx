import { Badge } from "@/components/ui/badge";

const recentSales = [
  { id: 1, cliente: "Empresa ABC Ltda", produto: "500 Cartões de Visita", valor: 120, status: "pago" },
  { id: 2, cliente: "Loja do João", produto: "Banner 3x1m", valor: 280, status: "pendente" },
  { id: 3, cliente: "Restaurante Sabor", produto: "100 Cardápios A4", valor: 450, status: "pago" },
  { id: 4, cliente: "Clínica Saúde", produto: "Placa ACM 2x1m", valor: 890, status: "parcial" },
  { id: 5, cliente: "Escritório Silva", produto: "1000 Flyers A5", valor: 180, status: "pago" },
];

const statusConfig = {
  pago: { label: "Pago", variant: "default" as const, className: "bg-success/10 text-success border-success/20" },
  pendente: { label: "Pendente", variant: "secondary" as const, className: "bg-warning/10 text-warning border-warning/20" },
  parcial: { label: "Parcial", variant: "outline" as const, className: "bg-info/10 text-info border-info/20" },
};

export function RecentSales() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-soft animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">Vendas Recentes</h3>
      <div className="space-y-4">
        {recentSales.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between py-3 border-b border-border last:border-0 last:pb-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{sale.cliente}</p>
              <p className="text-xs text-muted-foreground truncate">{sale.produto}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                R$ {sale.valor.toLocaleString("pt-BR")}
              </span>
              <Badge className={statusConfig[sale.status].className}>
                {statusConfig[sale.status].label}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
