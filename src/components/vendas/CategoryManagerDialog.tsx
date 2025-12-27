import { useState, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Pencil, Trash2, Settings, AlertCircle } from "lucide-react";
import { useSupabaseCategories, Category } from "@/hooks/useSupabaseCategories";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { toast } from "sonner";

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Digite o nome da categoria")
  .max(60, "Nome muito longo (máx. 60 caracteres)");

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extended category type that includes orphan categories from products
interface ExtendedCategory {
  id: string;
  name: string;
  isOrphan: boolean; // true if exists only in products, not in categories table
}

export function CategoryManagerDialog({ open, onOpenChange }: CategoryManagerDialogProps) {
  const { categories, isLoading, addCategory, updateCategory, deleteCategory, isAdding, isUpdating, isDeleting } = useSupabaseCategories();
  const { products } = useSupabaseProducts();
  
  // Add state
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Edit state
  const [editingCategory, setEditingCategory] = useState<ExtendedCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  
  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<ExtendedCategory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Combine categories from table AND unique categories from products
  const allCategories = useMemo<ExtendedCategory[]>(() => {
    // Get category names from products that are not in the categories table
    const categoryNamesFromTable = new Set(categories.map(c => c.name.toLowerCase()));
    const orphanCategoryNames = new Set<string>();
    
    products.forEach(product => {
      if (product.category && !categoryNamesFromTable.has(product.category.toLowerCase())) {
        orphanCategoryNames.add(product.category);
      }
    });
    
    // Map table categories to extended format
    const tableCategories: ExtendedCategory[] = categories.map(c => ({
      id: c.id,
      name: c.name,
      isOrphan: false,
    }));
    
    // Create orphan categories with generated IDs
    const orphanCategories: ExtendedCategory[] = Array.from(orphanCategoryNames).map(name => ({
      id: `orphan-${name}`,
      name,
      isOrphan: true,
    }));
    
    // Combine and sort alphabetically
    return [...tableCategories, ...orphanCategories].sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [categories, products]);

  const handleAddClick = () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }
    setShowAddConfirm(true);
  };

  const handleConfirmAdd = () => {
    addCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowAddConfirm(false);
    onOpenChange(false);
  };

  const handleEditClick = (category: ExtendedCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
  };

  const handleSaveEditClick = () => {
    if (!editCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }
    if (editCategoryName.trim() === editingCategory?.name) {
      setEditingCategory(null);
      setEditCategoryName("");
      return;
    }
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = () => {
    if (editingCategory) {
      if (editingCategory.isOrphan) {
        // For orphan categories, we need to add it to the table first, then update products
        addCategory(editCategoryName.trim());
        // Note: Product updates happen via the updateCategory cascade
      } else {
        updateCategory({ id: editingCategory.id, name: editCategoryName.trim(), previousName: editingCategory.name });
      }
    }
    setEditingCategory(null);
    setEditCategoryName("");
    setShowEditConfirm(false);
    onOpenChange(false);
  };

  const handleDeleteClick = (category: ExtendedCategory) => {
    setDeletingCategory(category);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deletingCategory) {
      if (deletingCategory.isOrphan) {
        // For orphan categories, we can just inform the user - products will use "Sem Categoria"
        toast.info("Categoria órfã removida. Os produtos serão atualizados.");
      } else {
        deleteCategory(deletingCategory.id);
      }
    }
    setDeletingCategory(null);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryName("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Gerenciar Categorias
            </DialogTitle>
            <DialogDescription>
              Adicione, edite ou remova categorias de produtos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new category */}
            <div className="flex gap-2">
              <Input
                placeholder="Nova categoria..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClick()}
                className="flex-1"
              />
              <Button 
                onClick={handleAddClick} 
                disabled={isAdding || !newCategoryName.trim()}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Categories list */}
            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Carregando categorias...
                </div>
              ) : allCategories.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhuma categoria cadastrada
                </div>
              ) : (
                allCategories.map((category) => (
                  <div key={category.id} className="p-3 flex items-center gap-2">
                    {editingCategory?.id === category.id ? (
                      <>
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditClick()}
                          className="flex-1"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={handleSaveEditClick}
                          disabled={isUpdating}
                        >
                          Salvar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelEdit}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium flex items-center gap-2">
                          {category.name}
                          {category.isOrphan && (
                            <span className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              (não registrada)
                            </span>
                          )}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => handleEditClick(category)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(category)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Add Dialog */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Criação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja criar a categoria <strong>"{newCategoryName}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd} disabled={isAdding}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Edit Dialog */}
      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Edição</AlertDialogTitle>
            <AlertDialogDescription>
              {editingCategory?.isOrphan ? (
                <>Deseja registrar e renomear a categoria <strong>"{editingCategory?.name}"</strong> para <strong>"{editCategoryName}"</strong>?</>
              ) : (
                <>Deseja alterar o nome da categoria de <strong>"{editingCategory?.name}"</strong> para <strong>"{editCategoryName}"</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowEditConfirm(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit} disabled={isUpdating || isAdding}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>Tem certeza que deseja excluir a categoria <strong>"{deletingCategory?.name}"</strong>?</span>
              <br />
              <span className="text-amber-600 dark:text-amber-500 block mt-2">
                ⚠️ Todas as subcategorias desta categoria serão excluídas e os produtos serão movidos para "Sem Categoria".
              </span>
              <span className="text-destructive block">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
