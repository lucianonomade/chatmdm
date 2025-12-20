import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Package, ArrowLeft, Ruler, Hash } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
import { useSupabaseSubcategories } from "@/hooks/useSupabaseSubcategories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ProductManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
  initialSubcategory?: string;
}

interface ProductFormData {
  name: string;
  category: string;
  subcategory: string;
  price: string;
  stock: string;
  type: "product" | "service";
  pricingMode: "quantidade" | "medidor";
}

const initialFormData: ProductFormData = {
  name: "",
  category: "",
  subcategory: "",
  price: "",
  stock: "0",
  type: "product",
  pricingMode: "quantidade",
};

export function ProductManagerDialog({
  open,
  onOpenChange,
  initialCategory = "",
  initialSubcategory = "",
}: ProductManagerDialogProps) {
  const { products, addProduct, updateProduct, deleteProduct, isAdding, isUpdating, isDeleting } = useSupabaseProducts();
  const { categories } = useSupabaseCategories();
  const { getSubcategoriesByCategory } = useSupabaseSubcategories();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<ProductFormData>({
    ...initialFormData,
    category: initialCategory,
    subcategory: initialSubcategory,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get category ID for subcategories
  const selectedCategoryObj = categories.find(c => c.name === formData.category);
  const availableSubcategories = selectedCategoryObj 
    ? getSubcategoriesByCategory(selectedCategoryObj.id)
    : [];

  // Filter products by current category/subcategory and search term
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !initialCategory || p.category === initialCategory;
    const matchesSubcategory = !initialSubcategory || p.subcategory === initialSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        ...initialFormData,
        category: initialCategory,
        subcategory: initialSubcategory,
      });
      setEditingProductId(null);
      setShowForm(false);
      setSearchTerm("");
    }
  }, [open, initialCategory, initialSubcategory]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }
    if (!formData.category) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Digite um preço válido");
      return;
    }

    const productData = {
      name: formData.name.trim(),
      category: formData.category,
      subcategory: formData.subcategory || null,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      description: null,
      type: formData.type,
      pricing_mode: formData.pricingMode,
    };

    try {
      if (editingProductId) {
        await updateProduct({ id: editingProductId, data: productData });
        toast.success("Produto atualizado!");
        // Fechar o dialog e voltar para a página de produtos
        onOpenChange(false);
      } else {
        await addProduct(productData);
        toast.success("Produto criado!");
        // Fechar o dialog completamente ao criar novo produto
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Erro ao salvar produto");
    }
  };

  const handleEdit = (product: typeof products[0]) => {
    const pricingModeFromDb = (product as any).pricing_mode || "quantidade";
    // Map old values to new Portuguese values
    let mappedPricingMode: "quantidade" | "medidor" = "quantidade";
    if (pricingModeFromDb === "meter" || pricingModeFromDb === "medidor") {
      mappedPricingMode = "medidor";
    }
    
    setFormData({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      type: product.type,
      pricingMode: mappedPricingMode,
    });
    setEditingProductId(product.id);
    setShowForm(true);
  };

  const handleDelete = (productId: string) => {
    setDeletingProductId(productId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingProductId) return;
    try {
      await deleteProduct(deletingProductId);
      toast.success("Produto excluído!");
    } catch (error) {
      toast.error("Erro ao excluir produto");
    }
    setDeletingProductId(null);
    setShowDeleteConfirm(false);
  };

  const handleBack = () => {
    setFormData({ ...initialFormData, category: initialCategory, subcategory: initialSubcategory });
    setEditingProductId(null);
    setShowForm(false);
  };

  const deletingProduct = products.find(p => p.id === deletingProductId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0" aria-describedby={undefined}>
          <DialogHeader className="p-4 pb-3 border-b shrink-0 pr-12 mt-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              {showForm && (
                <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <Package className="w-4 h-4" />
              {showForm ? (editingProductId ? "Editar" : "Novo Produto") : "Produtos"}
            </DialogTitle>
          </DialogHeader>

          {showForm ? (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Banner 440g"
                  className="h-9"
                />
              </div>

              {/* Categoria + Subcategoria */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subcategoria</Label>
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                    disabled={!formData.category}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Modo de Cálculo */}
              <div className="space-y-1.5">
                <Label className="text-xs">Modo de Cálculo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.pricingMode === "quantidade" ? "default" : "outline"}
                    size="sm"
                    className="h-9 gap-2"
                    onClick={() => setFormData({ ...formData, pricingMode: "quantidade" })}
                  >
                    <Hash className="w-4 h-4" />
                    Quantidade
                  </Button>
                  <Button
                    type="button"
                    variant={formData.pricingMode === "medidor" ? "default" : "outline"}
                    size="sm"
                    className="h-9 gap-2"
                    onClick={() => setFormData({ ...formData, pricingMode: "medidor" })}
                  >
                    <Ruler className="w-4 h-4" />
                    Metro²
                  </Button>
                </div>
              </div>

              {/* Preço + Estoque */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {formData.pricingMode === "medidor" ? "Preço/m² *" : "Preço *"}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0,00"
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estoque</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Salvar */}
              <Button 
                onClick={handleSubmit} 
                disabled={isAdding || isUpdating} 
                className="w-full h-10 mt-2"
              >
                {editingProductId ? "Salvar Alterações" : "Criar Produto"}
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Busca + Novo */}
              <div className="p-3 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar produto..."
                    className="pl-8 h-9"
                  />
                </div>
                <Button onClick={() => setShowForm(true)} className="w-full h-9" size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Novo Produto
                </Button>
              </div>

              {/* Lista */}
              <ScrollArea className="flex-1 px-3 pb-3">
                <div className="space-y-1.5">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum produto encontrado
                    </p>
                  ) : (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="truncate">{product.category}</span>
                            <span className="text-primary font-semibold">
                              R$ {product.price.toFixed(2)}
                            </span>
                            {(product as any).pricing_mode === "medidor" && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">m²</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir "{deletingProduct?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}