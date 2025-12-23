import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export interface Category {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
  tenant_id: string | null;
}

export function useSupabaseCategories() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  // Fetch all categories
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ["categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!tenantId,
  });

  // Add category
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("categories")
        .insert({ 
          name: name.trim(),
          created_by: userData.user?.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Categoria já existe");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error adding category:", error);
      toast.error(error.message || "Erro ao criar categoria");
    },
  });

  // Delete category (with cascade to subcategories and products)
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      // First get the category name to update products
      const { data: category, error: catError } = await supabase
        .from("categories")
        .select("name")
        .eq("id", id)
        .single();

      if (catError) throw catError;

      // Delete all subcategories that belong to this category
      const { error: subError } = await supabase
        .from("subcategories")
        .delete()
        .eq("category_id", id);

      if (subError) throw subError;

      // Update products that use this category to "Sem Categoria"
      const { error: prodError } = await supabase
        .from("products")
        .update({ category: "Sem Categoria", subcategory: null })
        .eq("category", category.name);

      if (prodError) throw prodError;

      // Finally delete the category
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Categoria removida com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error deleting category:", error);
      toast.error("Erro ao remover categoria");
    },
  });

  // Update category (and rename products that use it)
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, previousName }: { id: string; name: string; previousName?: string }) => {
      if (!tenantId) throw new Error("Tenant não encontrado");

      const nextName = name.trim();

      const { data, error } = await supabase
        .from("categories")
        .update({ name: nextName })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Categoria já existe");
        }
        throw error;
      }

      // If we know the previous name, update all products referencing it
      if (previousName && previousName.trim() && previousName.trim() !== nextName) {
        const { error: productsError } = await supabase
          .from("products")
          .update({ category: nextName })
          .eq("tenant_id", tenantId)
          .eq("category", previousName.trim());

        if (productsError) throw productsError;
      }

      return data;
    },
    onMutate: async ({ id, name }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      
      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<Category[]>(["categories"]);
      
      // Optimistically update
      queryClient.setQueryData<Category[]>(["categories"], (old) =>
        old?.map((cat) => (cat.id === id ? { ...cat, name: name.trim() } : cat)) ?? []
      );
      
      return { previousCategories };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(["categories"], context.previousCategories);
      }
      console.error("Error updating category:", error);
      toast.error(error.message || "Erro ao atualizar categoria");
    },
  });

  return {
    categories,
    isLoading,
    error,
    addCategory: addCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isAdding: addCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}
