import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { ServiceOrder } from "@/lib/types";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface OrdersStatusChartProps {
  filteredOrders?: ServiceOrder[];
}

export function OrdersStatusChart({ filteredOrders }: OrdersStatusChartProps) {
  const { orders } = useSupabaseOrders();
  const isMobile = useIsMobile();
  
  const ordersToUse = filteredOrders || orders;

  const chartData = useMemo(() => {
    const statusCount = {
      pending: ordersToUse.filter(o => o.status === 'pending').length,
      production: ordersToUse.filter(o => o.status === 'production').length,
      finished: ordersToUse.filter(o => o.status === 'finished').length,
      delivered: ordersToUse.filter(o => o.status === 'delivered').length,
    };
    
    return [
      { name: isMobile ? 'Aguard.' : 'Aguardando', value: statusCount.pending, fill: 'hsl(var(--warning))' },
      { name: isMobile ? 'Prod.' : 'Produção', value: statusCount.production, fill: 'hsl(var(--info))' },
      { name: 'Pronto', value: statusCount.finished, fill: 'hsl(var(--success))' },
      { name: isMobile ? 'Entreg.' : 'Entregue', value: statusCount.delivered, fill: 'hsl(var(--muted-foreground))' },
    ];
  }, [ordersToUse, isMobile]);

  return (
    <div className="h-40 sm:h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={isMobile ? 9 : 11}
            width={isMobile ? 50 : 70}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [value, 'Pedidos']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}