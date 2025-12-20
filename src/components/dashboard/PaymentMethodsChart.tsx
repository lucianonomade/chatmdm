import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { ServiceOrder } from "@/lib/types";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PaymentMethodsChartProps {
  filteredOrders?: ServiceOrder[];
}

export function PaymentMethodsChart({ filteredOrders }: PaymentMethodsChartProps) {
  const { orders } = useSupabaseOrders();
  const isMobile = useIsMobile();
  
  const ordersToUse = filteredOrders || orders;

  const chartData = useMemo(() => {
    const methods = { cash: 0, pix: 0, card: 0 };
    
    ordersToUse.forEach(order => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach(payment => {
          if (payment.method === 'cash') methods.cash += payment.amount;
          else if (payment.method === 'pix') methods.pix += payment.amount;
          else if (payment.method === 'card') methods.card += payment.amount;
        });
      } else if (order.paymentMethod && order.amountPaid) {
        if (order.paymentMethod === 'cash') methods.cash += order.amountPaid;
        else if (order.paymentMethod === 'pix') methods.pix += order.amountPaid;
        else if (order.paymentMethod === 'card') methods.card += order.amountPaid;
      }
    });
    
    return [
      { name: 'Dinheiro', value: methods.cash, color: 'hsl(var(--success))' },
      { name: 'PIX', value: methods.pix, color: 'hsl(var(--info))' },
      { name: 'Cartão', value: methods.card, color: 'hsl(var(--warning))' },
    ].filter(d => d.value > 0);
  }, [ordersToUse]);

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-48 text-muted-foreground text-sm">
        Sem dados de pagamento
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-28 sm:h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 30 : 40}
              outerRadius={isMobile ? 45 : 55}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                ''
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="space-y-1">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-xs sm:text-sm gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-medium text-[11px] sm:text-sm">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] sm:text-xs text-muted-foreground">
                ({((entry.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}