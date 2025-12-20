import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/lib/types";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export function useSupabaseProducts() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(p => {
        const rawPricingMode = (p as any).pricing_mode;
        const normalizedPricingMode =
          rawPricingMode === 'meter' || rawPricingMode === 'medidor'
            ? 'medidor'
            : rawPricingMode === 'quantity' || rawPricingMode === 'quantidade'
              ? 'quantidade'
              : 'quantidade';

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory || undefined,
          price: Number(p.price),
          stock: p.stock,
          type: p.type as 'product' | 'service',
          description: p.description || undefined,
          variations: p.variations as unknown as Product['variations'] || undefined,
          pricing_mode: normalizedPricingMode,
        };
      }) as Product[];
    },
    enabled: !!tenantId,
  });

  const addProduct = useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const rawPricingMode = (product as any).pricing_mode;
      const pricingMode =
        rawPricingMode === 'meter' || rawPricingMode === 'medidor'
          ? 'medidor'
          : 'quantidade';

      const { error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          category: product.category,
          subcategory: product.subcategory || null,
          price: product.price,
          stock: product.stock,
          type: product.type,
          description: product.description || null,
          variations: product.variations ? JSON.parse(JSON.stringify(product.variations)) : null,
          pricing_mode: pricingMode,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Error adding product:', error);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const dbData: Record<string, unknown> = {};
      if (data.name !== undefined) dbData.name = data.name;
      if (data.category !== undefined) dbData.category = data.category;
      if (data.subcategory !== undefined) dbData.subcategory = data.subcategory;
      if (data.price !== undefined) dbData.price = data.price;
      if (data.stock !== undefined) dbData.stock = data.stock;
      if (data.type !== undefined) dbData.type = data.type;
      if (data.description !== undefined) dbData.description = data.description;
      if (data.variations !== undefined) dbData.variations = data.variations;
      if ((data as any).pricing_mode !== undefined) {
        const rawPricingMode = (data as any).pricing_mode;
        dbData.pricing_mode = rawPricingMode === 'meter' || rawPricingMode === 'medidor' ? 'medidor' : 'quantidade';
      }

      const { error } = await supabase
        .from('products')
        .update(dbData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Error updating product:', error);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
    },
  });

  // Get low stock products
  const getLowStockProducts = (threshold: number = 10) => {
    return products.filter(p => p.type === 'product' && p.stock <= threshold);
  };

  return {
    products,
    isLoading,
    error,
    addProduct: addProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    getLowStockProducts,
    isAdding: addProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
  };
}
