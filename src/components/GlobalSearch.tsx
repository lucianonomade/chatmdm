import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import {
  Users,
  Package,
  FileText,
  ShoppingCart,
  Settings,
  LayoutDashboard,
  Truck,
  Wallet,
  ClipboardList,
  Receipt,
  BarChart3,
} from "lucide-react";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { orders } = useStore();
  const { customers } = useSupabaseCustomers();
  const { products } = useSupabaseProducts();
  const [search, setSearch] = useState("");

  const handleSelect = (path: string) => {
    onOpenChange(false);
    setSearch("");
    navigate(path);
  };

  const pages = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "PDV / Vendas", path: "/vendas", icon: ShoppingCart },
    { name: "Ordens de Serviço", path: "/ordens-servico", icon: ClipboardList },
    { name: "Clientes", path: "/clientes", icon: Users },
    { name: "Produtos", path: "/produtos", icon: Package },
    { name: "Fornecedores", path: "/fornecedores", icon: Truck },
    { name: "Financeiro", path: "/financeiro", icon: Wallet },
    { name: "Caixa", path: "/caixa", icon: Receipt },
    { name: "Relatórios", path: "/relatorios", icon: BarChart3 },
    { name: "Configurações", path: "/configuracoes", icon: Settings },
  ];

  const filteredCustomers = customers
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  const filteredOrders = orders
    .filter(
      (o) =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar clientes, produtos, pedidos..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Páginas">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => handleSelect(page.path)}
              className="cursor-pointer"
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {filteredCustomers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clientes">
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  onSelect={() => handleSelect(`/clientes?search=${customer.name}`)}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{customer.name}</span>
                  {customer.phone && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {customer.phone}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredProducts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Produtos">
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => handleSelect(`/produtos?search=${product.name}`)}
                  className="cursor-pointer"
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span>{product.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    R$ {product.price.toFixed(2)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredOrders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pedidos">
              {filteredOrders.map((order) => (
                <CommandItem
                  key={order.id}
                  onSelect={() => handleSelect(`/ordens-servico?order=${order.id}`)}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>#{order.id} - {order.customerName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    R$ {order.total.toFixed(2)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
