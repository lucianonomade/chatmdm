import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { ServiceOrder } from "@/lib/types";
import { useMemo } from "react";

interface SalesChartProps {
  period?: 'week' | 'month' | 'year';
  filteredOrders?: ServiceOrder[];
}

export function SalesChart({ period = 'week', filteredOrders }: SalesChartProps) {
  const { orders } = useSupabaseOrders();
  
  const ordersToUse = filteredOrders || orders;

  const chartData = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const dayOrders = ordersToUse.filter(o => 
          new Date(o.createdAt).toDateString() === dateStr
        );
        const total = dayOrders.reduce((acc, o) => acc + o.total, 0);
        const received = dayOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
        days.push({
          name: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
          vendas: total,
          recebido: received,
          pedidos: dayOrders.length
        });
      }
      return days;
    }
    
    if (period === 'month') {
      // Last 30 days grouped by week
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        
        const weekOrders = ordersToUse.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= weekStart && orderDate <= weekEnd;
        });
        const total = weekOrders.reduce((acc, o) => acc + o.total, 0);
        const received = weekOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
        
        weeks.push({
          name: `Sem ${4 - i}`,
          vendas: total,
          recebido: received,
          pedidos: weekOrders.length
        });
      }
      return weeks;
    }
    
    // Year - last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthOrders = ordersToUse.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthDate && orderDate <= monthEnd;
      });
      const total = monthOrders.reduce((acc, o) => acc + o.total, 0);
      const received = monthOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
      
      months.push({
        name: monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        vendas: total,
        recebido: received,
        pedidos: monthOrders.length
      });
    }
    return months;
  }, [ordersToUse, period]);

  const totalVendas = chartData.reduce((acc, d) => acc + d.vendas, 0);
  const totalRecebido = chartData.reduce((acc, d) => acc + d.recebido, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground">Total em Vendas</p>
          <p className="text-2xl font-bold text-foreground">R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Recebido</p>
          <p className="text-xl font-semibold text-success">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 
                name === 'vendas' ? 'Vendas' : 'Recebido'
              ]}
            />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVendas)"
            />
            <Area
              type="monotone"
              dataKey="recebido"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRecebido)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}