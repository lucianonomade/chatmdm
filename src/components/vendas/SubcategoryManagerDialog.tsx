import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSubcategories } from "@/hooks/useSupabaseSubcategories";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
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

interface SubcategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  subcategories: string[];
}

export function SubcategoryManagerDialog({
  open,
  onOpenChange,
  category,
  subcategories: productSubcategories,
}: SubcategoryManagerDialogProps) {
  const { products, updateProduct } = useSupabaseProducts();
  const { categories } = useSupabaseCategories();
  const { 
    subcategories: dbSubcategories, 
    addSubcategoryAsync, 
    updateSubcategory, 
    deleteSubcategory,
    isAdding 
  } = useSupabaseSubcategories();
  
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [deletingSubcategory, setDeletingSubcategory] = useState<string | null>(null);
  
  // Confirmation dialogs
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get category ID from name
  const categoryObj = categories.find(c => c.name === category);
  const categoryId = categoryObj?.id;

  // Merge subcategories from DB and products
  const dbSubsForCategory = dbSubcategories
    .filter(sub => sub.category_id === categoryId)
    .map(sub => ({ name: sub.name, id: sub.id, fromDb: true }));
  
  const allSubcategoryNames = new Set([
    ...dbSubsForCategory.map(s => s.name),
    ...productSubcategories
  ]);
  
  const mergedSubcategories = Array.from(allSubcategoryNames).map(name => {
    const dbSub = dbSubsForCategory.find(s => s.name === name);
    return {
      name,
      id: dbSub?.id,
      fromDb: !!dbSub
    };
  });

  const handleAddClick = () => {
    if (!newSubcategoryName.trim()) {
      toast.error("Digite o nome da subcategoria");
      return;
    }
    if (allSubcategoryNames.has(newSubcategoryName.trim())) {
      toast.error("Essa subcategoria já existe");
      return;
    }
    setShowAddConfirm(true);
  };

  const handleConfirmAdd = async () => {
    if (!categoryId) {
      toast.error("Categoria não encontrada");
      setShowAddConfirm(false);
      return;
    }

    try {
      await addSubcategoryAsync({ 
        name: newSubcategoryName.trim(), 
        categoryId 
      });
      setNewSubcategoryName("");
      setShowAddConfirm(false);
      onOpenChange(false); // Close dialog and return to subcategory view
    } catch (error) {
      // Error handled by mutation
      setShowAddConfirm(false);
    }
  };

  const handleEditClick = (subcategory: string) => {
    setEditingSubcategory(subcategory);
    setEditSubcategoryName(subcategory);
  };

  const handleConfirmEditClick = () => {
    if (!editSubcategoryName.trim()) {
      toast.error("Digite o nome da subcategoria");
      return;
    }
    if (editSubcategoryName.trim() === editingSubcategory) {
      setEditingSubcategory(null);
      setEditSubcategoryName("");
      return;
    }
    if (allSubcategoryNames.has(editSubcategoryName.trim()) && editSubcategoryName.trim() !== editingSubcategory) {
      toast.error("Essa subcategoria já existe");
      return;
    }
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingSubcategory) return;
    
    const subToEdit = mergedSubcategories.find(s => s.name === editingSubcategory);
    
    // Update in DB if exists there
    if (subToEdit?.id) {
      updateSubcategory({ id: subToEdit.id, name: editSubcategoryName.trim() });
    }
    
    // Also update all products with this subcategory
    const productsToUpdate = products.filter(
      p => p.category === category && p.subcategory === editingSubcategory
    );
    
    try {
      for (const product of productsToUpdate) {
        await updateProduct({
          id: product.id,
          data: { subcategory: editSubcategoryName.trim() },
        });
      }
      if (productsToUpdate.length > 0) {
        toast.success(`Subcategoria atualizada em ${productsToUpdate.length} produto(s)!`);
      }
    } catch (error) {
      toast.error("Erro ao atualizar produtos");
    }
    
    setEditingSubcategory(null);
    setEditSubcategoryName("");
    setShowEditConfirm(false);
    onOpenChange(false); // Close dialog and return to subcategory view
  };

  const handleDeleteClick = (subcategory: string) => {
    setDeletingSubcategory(subcategory);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubcategory) return;
    
    // Check if any products use this subcategory
    const productsWithSubcategory = products.filter(
      p => p.category === category && p.subcategory === deletingSubcategory
    );
    
    if (productsWithSubcategory.length > 0) {
      toast.error(`Não é possível excluir. ${productsWithSubcategory.length} produto(s) usam esta subcategoria.`);
    } else {
      // Delete from DB if exists there
      const subToDelete = mergedSubcategories.find(s => s.name === deletingSubcategory);
      if (subToDelete?.id) {
        deleteSubcategory(subToDelete.id);
      } else {
        toast.success("Subcategoria removida!");
      }
    }
    
    // Always close dialogs and return to subcategory view
    setDeletingSubcategory(null);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleCancelEdit = () => {
    setEditingSubcategory(null);
    setEditSubcategoryName("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Gerenciar Subcategorias - {category}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add new subcategory */}
            <div className="flex gap-2">
              <Input
                placeholder="Nova subcategoria..."
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClick()}
              />
              <Button onClick={handleAddClick} size="icon" disabled={isAdding}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* List existing subcategories */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {mergedSubcategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma subcategoria encontrada
                </p>
              ) : (
                mergedSubcategories.map((sub) => (
                  <div
                    key={sub.name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    {editingSubcategory === sub.name ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editSubcategoryName}
                          onChange={(e) => setEditSubcategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirmEditClick()}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleConfirmEditClick}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{sub.name}</span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEditClick(sub.name)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(sub.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Subcategoria</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar a subcategoria "{newSubcategoryName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Subcategoria</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja alterar "{editingSubcategory}" para "{editSubcategoryName}"?
              Todos os produtos desta subcategoria serão atualizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Subcategoria</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir a subcategoria "{deletingSubcategory}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
