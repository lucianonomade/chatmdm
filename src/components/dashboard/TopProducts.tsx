import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Cartão de Visita", vendas: 156 },
  { name: "Banner Lona", vendas: 89 },
  { name: "Flyer A5", vendas: 78 },
  { name: "Adesivo Vinil", vendas: 65 },
  { name: "Folder A4", vendas: 52 },
];

const colors = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(199, 89%, 48%)",
];

export function TopProducts() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-soft animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">Produtos Mais Vendidos</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="hsl(215, 16%, 47%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="hsl(215, 16%, 47%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              formatter={(value: number) => [`${value} unidades`, "Vendas"]}
            />
            <Bar dataKey="vendas" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
