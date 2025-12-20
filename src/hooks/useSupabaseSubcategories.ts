import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "./useTenant";

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  created_by: string | null;
  tenant_id: string | null;
}

export function useSupabaseSubcategories() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  // Fetch all subcategories
  const { data: subcategories = [], isLoading, error } = useQuery({
    queryKey: ["subcategories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Subcategory[];
    },
    enabled: !!tenantId,
  });

  // Add subcategory
  const addSubcategoryMutation = useMutation({
    mutationFn: async ({ name, categoryId }: { name: string; categoryId: string }) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("subcategories")
        .insert({ 
          name: name.trim(),
          category_id: categoryId,
          created_by: userData.user?.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Subcategoria já existe nesta categoria");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Subcategoria criada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error adding subcategory:", error);
      toast.error(error.message || "Erro ao criar subcategoria");
    },
  });

  // Delete subcategory
  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subcategories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Subcategoria removida com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error deleting subcategory:", error);
      toast.error("Erro ao remover subcategoria");
    },
  });

  // Update subcategory
  const updateSubcategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("subcategories")
        .update({ name: name.trim() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Subcategoria já existe nesta categoria");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (error: Error) => {
      console.error("Error updating subcategory:", error);
      toast.error(error.message || "Erro ao atualizar subcategoria");
    },
  });

  // Get subcategories by category
  const getSubcategoriesByCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  // Get subcategories by category name (for compatibility with existing code)
  const getSubcategoriesByCategoryName = (categoryName: string, categories: { id: string; name: string }[]) => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return [];
    return subcategories.filter(sub => sub.category_id === category.id);
  };

  return {
    subcategories,
    isLoading,
    error,
    addSubcategory: addSubcategoryMutation.mutate,
    addSubcategoryAsync: addSubcategoryMutation.mutateAsync,
    updateSubcategory: updateSubcategoryMutation.mutate,
    deleteSubcategory: deleteSubcategoryMutation.mutate,
    getSubcategoriesByCategory,
    getSubcategoriesByCategoryName,
    isAdding: addSubcategoryMutation.isPending,
    isUpdating: updateSubcategoryMutation.isPending,
    isDeleting: deleteSubcategoryMutation.isPending,
  };
}
