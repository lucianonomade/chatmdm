import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, Package, Download, Upload, Loader2, ShoppingBag, X, Pencil } from "lucide-react";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
import { Product } from "@/lib/types";
import { toast } from "sonner";
import { generateProductTemplate, parseProductsExcel, exportProductsToExcel } from "@/lib/excelUtils";

export default function Produtos() {
  const { 
    products, 
    isLoading, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    isAdding,
    isUpdating,
    isDeleting 
  } = useSupabaseProducts();
  
  const { 
    categories: dbCategories, 
    addCategory,
    updateCategory,
    deleteCategory 
  } = useSupabaseCategories();
  
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'create' | 'edit'>('create');
  const [categoryInputValue, setCategoryInputValue] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    subcategory: "",
    price: "",
    stock: "",
    type: "product" as "product" | "service",
    description: "",
    pricing_mode: "quantidade" as "quantidade" | "medidor",
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: "", category: "", subcategory: "", price: "", stock: "", type: "product", description: "", pricing_mode: "quantidade" });
    setEditingProduct(null);
  };

  const handleDownloadTemplate = () => {
    generateProductTemplate();
    toast.success("Template baixado com sucesso!");
  };

  const handleExportProducts = () => {
    if (products.length === 0) {
      toast.error("Nenhum produto cadastrado para exportar");
      return;
    }
    exportProductsToExcel(products);
    toast.success(`${products.length} produtos exportados com sucesso!`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedProducts = await parseProductsExcel(file);
      
      let added = 0;
      let updated = 0;
      
      for (const product of importedProducts) {
        // Check if product has an ID (from export) or find by name
        const existingProduct = product.id 
          ? products.find(p => p.id === product.id)
          : products.find(p => p.name.toLowerCase().trim() === product.nome.toLowerCase().trim());
        
        const productData = {
          name: product.nome,
          category: product.categoria,
          subcategory: product.subcategoria,
          price: product.preco,
          stock: product.estoque,
          type: product.tipo === 'servico' ? 'service' as const : 'product' as const,
          pricing_mode: product.modo_calculo,
          description: product.descricao,
        };
        
        if (existingProduct) {
          // Update existing product
          updateProduct({
            id: existingProduct.id,
            data: productData
          });
          updated++;
        } else {
          // Add new product
          addProduct(productData);
          added++;
        }
      }
      
      const messages = [];
      if (added > 0) messages.push(`${added} novos`);
      if (updated > 0) messages.push(`${updated} atualizados`);
      toast.success(`Produtos importados: ${messages.join(', ')}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar arquivo");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || "",
        price: product.price.toString(),
        stock: product.stock.toString(),
        type: product.type,
        description: product.description || "",
        pricing_mode: product.pricing_mode || "quantidade",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // Se não está editando produto e não tem dados para criar, apenas fecha
    if (!editingProduct && !formData.name && !formData.price) {
      setIsDialogOpen(false);
      resetForm();
      return;
    }

    if (!formData.name || !formData.category || !formData.price) {
      toast.error("Preencha nome, categoria e preço");
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category,
      subcategory: formData.subcategory || undefined,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      type: formData.type,
      description: formData.description || undefined,
      pricing_mode: formData.pricing_mode,
    };

    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: productData });
    } else {
      addProduct(productData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const getStatusConfig = (product: Product) => {
    if (product.stock === 0) return { label: "Esgotado", className: "bg-destructive/10 text-destructive border-destructive/20" };
    if (product.stock <= 20) return { label: "Estoque Baixo", className: "bg-warning/10 text-warning border-warning/20" };
    return { label: "Em Estoque", className: "bg-success/10 text-success border-success/20" };
  };

  // Get unique categories for dropdown - merge database categories with product categories
  const productCategories = [...new Set(products.map(p => p.category))];
  const allCategoryNames = dbCategories.map(c => c.name);
  const categories = [...new Set([...allCategoryNames, ...productCategories])].sort();

  // Loading skeleton
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <MainLayout title="Produtos">
      <div className="space-y-4 sm:space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 flex-wrap">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />
            
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm" onClick={handleExportProducts}>
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Export</span>
            </Button>
            
            <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm" onClick={handleDownloadTemplate}>
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Template</span>
              <span className="sm:hidden">Templ.</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1 text-xs sm:text-sm" 
              onClick={handleImportClick}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Upload className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden sm:inline">{isImporting ? "Importando..." : "Importar"}</span>
              <span className="sm:hidden">{isImporting ? "..." : "Import"}</span>
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground gap-1 text-xs sm:text-sm col-span-2 sm:col-span-1" onClick={() => handleOpenDialog()}>
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">{editingProduct ? "Editar Produto" : "Cadastrar Produto"}</DialogTitle>
                </DialogHeader>
                <form className="space-y-3 sm:space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select 
                        value={formData.category || undefined}
                        onValueChange={(v) => {
                          if (v === "__new__") {
                            setCategoryDialogMode('create');
                            setCategoryInputValue("");
                            setEditingCategoryId(null);
                            setEditingCategoryOldName("");
                            setCategoryDialogOpen(true);
                          } else {
                            setFormData(prev => ({ ...prev, category: v }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione ou crie">
                            {formData.category || "Selecione ou crie"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="__new__" className="text-primary font-medium">
                            <span className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Criar nova categoria
                            </span>
                          </SelectItem>
                          {categories.map(cat => {
                            const dbCat = dbCategories.find(c => c.name === cat);
                            return (
                              <div key={cat} className="flex items-center justify-between pr-2 group">
                                <SelectItem value={cat} className="flex-1">{cat}</SelectItem>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCategoryDialogMode('edit');
                                      setCategoryInputValue(cat);
                                      setEditingCategoryId(dbCat?.id || null);
                                      setEditingCategoryOldName(cat);
                                      setCategoryDialogOpen(true);
                                    }}
                                    className="p-1 hover:bg-primary/10 rounded"
                                  >
                                    <Pencil className="h-3 w-3 text-primary" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (dbCat) {
                                        deleteCategory(dbCat.id);
                                        toast.success(`Categoria "${cat}" excluída`);
                                      } else {
                                        toast.info("Esta categoria existe apenas nos produtos cadastrados");
                                      }
                                      if (formData.category === cat) {
                                        setFormData(prev => ({ ...prev, category: "" }));
                                      }
                                    }}
                                    className="p-1 hover:bg-destructive/10 rounded"
                                  >
                                    <X className="h-3 w-3 text-destructive" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategoria</Label>
                      <Input 
                        placeholder="Ex: Cartões" 
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Nome do Produto *</Label>
                    <Input 
                      placeholder="Ex: Cartão de Visita" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Descrição</Label>
                    <Textarea 
                      placeholder="Descrição do produto ou serviço (opcional)" 
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="text-sm min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preço (R$) *</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0,00" 
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque</Label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "product" | "service" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="product">Produto</SelectItem>
                          <SelectItem value="service">Serviço</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modo de Cálculo</Label>
                      <Select value={formData.pricing_mode} onValueChange={(v) => setFormData({ ...formData, pricing_mode: v as "quantidade" | "medidor" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="quantidade">Quantidade</SelectItem>
                          <SelectItem value="medidor">Metro (m²)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="gradient-primary text-primary-foreground"
                      disabled={isAdding || isUpdating || (!formData.name && !formData.category && !formData.price)}
                    >
                      {(isAdding || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingProduct ? "Salvar Alterações" : "Salvar Produto"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card rounded-xl border border-border shadow-soft max-w-full">
          <div className="w-full max-w-full overflow-x-auto">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Produto</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Categoria</TableHead>
                    <TableHead className="font-semibold text-right">Preço</TableHead>
                    <TableHead className="font-semibold text-center">Estoque</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Nenhum produto encontrado</p>
                            <p className="text-sm text-muted-foreground">
                              {search ? "Tente ajustar sua busca" : "Clique em 'Novo Produto' para começar"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-hover/10 border-b-2 border-transparent hover:border-hover/30 transition-all duration-200 cursor-pointer">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium">{product.name}</span>
                              {product.subcategory && (
                                <p className="text-xs text-muted-foreground">{product.subcategory}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[240px]">
                          {product.description ? (
                            <span className="line-clamp-2 text-sm break-words">{product.description}</span>
                          ) : (
                            <span className="text-muted-foreground/50 text-sm italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.category}</TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">
                          R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">{product.stock}</TableCell>
                        <TableCell>
                          <Badge className={getStatusConfig(product).className}>
                            {getStatusConfig(product).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setProductToDelete(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{productToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryDialogMode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da categoria</Label>
              <Input
                placeholder="Ex: Impressos"
                value={categoryInputValue}
                onChange={(e) => setCategoryInputValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={async () => {
                if (!categoryInputValue.trim()) {
                  toast.error("Digite o nome da categoria");
                  return;
                }
                const trimmedName = categoryInputValue.trim();
                
                if (categoryDialogMode === 'create') {
                  addCategory(trimmedName);
                  setFormData(prev => ({ ...prev, category: trimmedName }));
                } else {
                  // Se existe no banco, atualiza
                  if (editingCategoryId) {
                    updateCategory({ id: editingCategoryId, name: trimmedName });
                  } else {
                    // Se a categoria só existe em produtos, cria no banco primeiro
                    addCategory(trimmedName);
                  }
                  
                  // Atualiza todos os produtos que usam a categoria antiga
                  const productsWithOldCategory = products.filter(p => p.category === editingCategoryOldName);
                  productsWithOldCategory.forEach(product => {
                    updateProduct({ id: product.id, data: { category: trimmedName } });
                  });
                  
                  if (formData.category === editingCategoryOldName) {
                    setFormData(prev => ({ ...prev, category: trimmedName }));
                  }
                  
                  toast.success(`Categoria "${editingCategoryOldName}" renomeada para "${trimmedName}"`);
                }
                
                setCategoryDialogOpen(false);
                setCategoryInputValue("");
              }}
            >
              {categoryDialogMode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
