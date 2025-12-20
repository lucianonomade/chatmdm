import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore, Product, ProductVariation } from '@/lib/store';
import { Json } from '@/integrations/supabase/types';

export function useProducts() {
  const products = useStore(state => state.products);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      if (data) {
        // Transform Supabase data to store format
        const transformedProducts: Product[] = data.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory || undefined,
          price: Number(p.price),
          stock: p.stock,
          type: p.type as 'product' | 'service',
          description: p.description || undefined,
          variations: p.variations ? (p.variations as unknown as ProductVariation[]) : undefined,
        }));

        // Update store with fetched products
        useStore.setState({ products: transformedProducts });
      }
    };

    fetchProducts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          // Refetch on any change
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { products };
}
