import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
import { useSupabaseSubcategories } from "@/hooks/useSupabaseSubcategories";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { playClickSound } from "@/hooks/useClickSound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  ArrowLeft,
  ChevronRight,
  Package,
  Palette,
  Wrench,
  FileText,
  Settings,
  PenLine,
  X,
  ListFilter,
  Check,
  UserPlus,
  Printer,
  ChevronDown,
  QrCode,
  Delete,
  LayoutGrid,
  Image as ImageIcon,
  MousePointer2,
  Pencil,
  ShoppingBag,
  Stamp,
  BookOpen,
  Sticker,
  Flag,
  CreditCard as CardIcon,
  StickyNote,
  Bookmark,
  Tag,
  Gift,
  Box,
  Layers,
  Frame,
  Shirt,
  Award,
  Calendar,
  ClipboardList,
  FileCheck,
  Megaphone,
  MapPin,
  Sparkles,
  Zap,
  Star,
  Heart,
  Coffee,
  Briefcase,
  Building2,
  Car,
  Gem,
  Crown,
} from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { PurchaseDialog } from "@/components/vendas/PurchaseDialog";
import { CategoryManagerDialog } from "@/components/vendas/CategoryManagerDialog";
import { SubcategoryManagerDialog } from "@/components/vendas/SubcategoryManagerDialog";
import { ProductManagerDialog } from "@/components/vendas/ProductManagerDialog";
import { useStore, Product, OrderItem } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAutoNotifications } from "@/hooks/useAutoNotifications";

// Finishing options default
const DEFAULT_FINISHING_OPTIONS = [
  "Sem Acabamento",
  "Ilhós",
  "Bainha",
  "Madeirinha",
  "Recorte Eletrônico",
  "Laminação Fosca",
  "Laminação Brilho",
  "Verniz UV",
  "Dobra",
  "Furo",
  "Corte Especial",
  "Vinco",
];

export default function Vendas() {
  const [searchParams] = useSearchParams();
  const editOrderId = searchParams.get('editOrder');
  
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    clearCart, 
    users,
    companySettings,
  } = useStore();
  const { products } = useSupabaseProducts();
  const { categories: dbCategories } = useSupabaseCategories();
  const { subcategories: dbSubcategories, getSubcategoriesByCategoryName } = useSupabaseSubcategories();
  const { customers, addCustomer, isAdding: isAddingCustomer } = useSupabaseCustomers();
  const { addOrder, updateOrder } = useSupabaseOrders();
  const { settings: cloudSettings } = useCompanySettings();
  const { authUser } = useAuth();
  const { notifyNewSale, notifyPendingPayment } = useAutoNotifications();
  
  // Editing order state
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  
  // View state
  const [viewMode, setViewMode] = useState<'categories' | 'subcategories' | 'products'>('categories');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  
  // Product selection state
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null);
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<string>("1");
  const [selectedTotal, setSelectedTotal] = useState<string>("");
  const [currentBasePrice, setCurrentBasePrice] = useState<number>(0);
  
  // Custom options state
  const [dimensions, setDimensions] = useState({ width: "", height: "" });
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([]);
  const [customDescription, setCustomDescription] = useState("");
  const [finishingOptions, setFinishingOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('finishingOptions');
    return saved ? JSON.parse(saved) : DEFAULT_FINISHING_OPTIONS;
  });
  const [newFinishing, setNewFinishing] = useState("");
  const [finishingPopoverOpen, setFinishingPopoverOpen] = useState(false);
  
  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  
  // Seller state
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  
  // Payment state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pix' | 'card' | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [installments, setInstallments] = useState<number>(1);
  
  // Receipt state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSaleItems, setLastSaleItems] = useState<OrderItem[]>([]);
  const [lastSaleCustomer, setLastSaleCustomer] = useState<{name: string} | null>(null);
  const [lastSaleDate, setLastSaleDate] = useState<Date | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastSaleSeller, setLastSaleSeller] = useState<string | null>(null);
  const [lastSalePaymentMethod, setLastSalePaymentMethod] = useState<'cash' | 'pix' | 'card' | null>(null);
  const [lastSaleAmountPaid, setLastSaleAmountPaid] = useState<number>(0);
  const [lastSaleRemaining, setLastSaleRemaining] = useState<number>(0);
  const [lastSaleInstallments, setLastSaleInstallments] = useState<number>(1);
  
  // Quick sale state
  const [quickSaleDialogOpen, setQuickSaleDialogOpen] = useState(false);
  const [quickSaleCustomer, setQuickSaleCustomer] = useState("");
  const [quickSaleDesc, setQuickSaleDesc] = useState("");
  const [quickSaleAmount, setQuickSaleAmount] = useState("");
  const [quickSaleQuantity, setQuickSaleQuantity] = useState("1");
  
  // Purchase state
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [subcategoryManagerOpen, setSubcategoryManagerOpen] = useState(false);
  const [productManagerOpen, setProductManagerOpen] = useState(false);

  // Set seller on mount
  useEffect(() => {
    if (authUser?.role === 'seller') {
      setSelectedSeller(authUser.id);
    } else if (users.length > 0 && !selectedSeller) {
      setSelectedSeller(users[0].id);
    }
  }, [users, selectedSeller, authUser]);

  // Load editing order from sessionStorage
  useEffect(() => {
    if (editOrderId) {
      const storedOrder = sessionStorage.getItem('editingOrder');
      if (storedOrder) {
        try {
          const order = JSON.parse(storedOrder);
          if (order.id === editOrderId) {
            // Clear cart first
            clearCart();
            
            // Set the editing order ID
            setEditingOrderId(order.id);
            
            // Set customer
            if (order.customerId) {
              setSelectedCustomer(order.customerId);
            }
            
            // Set seller
            if (order.sellerId) {
              setSelectedSeller(order.sellerId);
            }
            
            // Add items to cart with original prices preserved
            order.items.forEach((item: any) => {
              const product = products.find(p => p.id === item.productId);
              if (product) {
                addToCart(product, item.quantity, undefined, {
                  finishing: item.finishing,
                  customDescription: item.customDescription,
                  dimensions: item.dimensions,
                  variationNameOverride: item.variationName,
                  priceOverride: item.price,
                  totalOverride: item.total,
                });
              } else {
                // Product not found, create a placeholder with original values
                const placeholderProduct: Product = {
                  id: item.productId || `temp-${Date.now()}`,
                  name: item.name,
                  category: item.category || 'Outros',
                  subcategory: item.subcategory,
                  price: item.price,
                  stock: 999,
                  type: 'service'
                };
                addToCart(placeholderProduct, item.quantity, undefined, {
                  finishing: item.finishing,
                  customDescription: item.customDescription,
                  dimensions: item.dimensions,
                  variationNameOverride: item.variationName,
                  priceOverride: item.price,
                  totalOverride: item.total,
                });
              }
            });
            
            toast.info(`Editando pedido #${order.id}`);
            sessionStorage.removeItem('editingOrder');
          }
        } catch (e) {
          console.error('Failed to load editing order:', e);
        }
      }
    }
  }, [editOrderId, products, clearCart, addToCart]);
  // Derived Data - merge database categories with product categories
  const categories = useMemo(() => {
    const productCats = new Set(products.map(p => p.category));
    const dbCatNames = dbCategories.map(c => c.name);
    const allCats = new Set([...productCats, ...dbCatNames]);
    return ["Todos", ...Array.from(allCats).sort()];
  }, [products, dbCategories]);

  // Get subcategories/products for selected category - merge from products AND database
  const subcategories = useMemo(() => {
    if (selectedCategory === "Todos") return [];
    
    // Get subcategories from products
    const productSubs = new Set(
      products
        .filter(p => p.category === selectedCategory)
        .map(p => p.subcategory || p.name)
    );
    
    // Get subcategories from database
    const dbSubs = getSubcategoriesByCategoryName(selectedCategory, dbCategories);
    dbSubs.forEach(sub => productSubs.add(sub.name));
    
    return Array.from(productSubs).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [products, selectedCategory, dbSubcategories, dbCategories, getSubcategoriesByCategoryName]);

  // Get products for selected subcategory
  const subcategoryProducts = useMemo(() => {
    if (!selectedSubcategory) return [];
    return products.filter(p => 
      p.category === selectedCategory && 
      (p.subcategory === selectedSubcategory || p.name === selectedSubcategory)
    );
  }, [products, selectedCategory, selectedSubcategory]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Switch to products view when searching
  useEffect(() => {
    if (searchTerm) {
      setViewMode('products');
      setSelectedCategory("Todos");
      setSelectedSubcategory(null);
    }
  }, [searchTerm]);

  const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

  // Category icon helper
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('comunicação') || lower.includes('visual')) return <Palette className="h-8 w-8 text-purple-500" />;
    if (lower.includes('gráfica') || lower.includes('impressão')) return <Printer className="h-8 w-8 text-blue-500" />;
    if (lower.includes('papelaria')) return <PenLine className="h-8 w-8 text-amber-500" />;
    if (lower.includes('serviço')) return <MousePointer2 className="h-8 w-8 text-emerald-500" />;
    if (lower.includes('design') || lower.includes('arte')) return <ImageIcon className="h-8 w-8 text-pink-500" />;
    return <LayoutGrid className="h-8 w-8 text-slate-500" />;
  };

  // Subcategory icon helper - returns varied modern icons
  const getSubcategoryIcon = (subcategory: string) => {
    const lower = subcategory.toLowerCase();
    
    // Banners e faixas
    if (lower.includes('banner')) return <Flag className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />;
    if (lower.includes('faixa')) return <Megaphone className="w-5 h-5 lg:w-6 lg:h-6 text-orange-500" />;
    if (lower.includes('lona')) return <Frame className="w-5 h-5 lg:w-6 lg:h-6 text-cyan-500" />;
    
    // Adesivos e etiquetas
    if (lower.includes('adesivo')) return <Sticker className="w-5 h-5 lg:w-6 lg:h-6 text-pink-500" />;
    if (lower.includes('etiqueta')) return <Tag className="w-5 h-5 lg:w-6 lg:h-6 text-violet-500" />;
    if (lower.includes('vinil')) return <Layers className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-500" />;
    
    // Cartões e impressos
    if (lower.includes('cartão') || lower.includes('cartao')) return <CardIcon className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />;
    if (lower.includes('convite')) return <Gift className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500" />;
    if (lower.includes('flyer') || lower.includes('panfleto')) return <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-sky-500" />;
    if (lower.includes('folder')) return <BookOpen className="w-5 h-5 lg:w-6 lg:h-6 text-teal-500" />;
    if (lower.includes('catálogo') || lower.includes('catalogo')) return <ClipboardList className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" />;
    
    // Carimbo e selo
    if (lower.includes('carimbo')) return <Stamp className="w-5 h-5 lg:w-6 lg:h-6 text-red-500" />;
    if (lower.includes('selo')) return <Award className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500" />;
    
    // Papelaria
    if (lower.includes('bloco')) return <StickyNote className="w-5 h-5 lg:w-6 lg:h-6 text-lime-500" />;
    if (lower.includes('marca') || lower.includes('book')) return <Bookmark className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500" />;
    if (lower.includes('agenda') || lower.includes('calendário') || lower.includes('calendario')) return <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />;
    
    // Placas e sinalizações
    if (lower.includes('placa')) return <MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />;
    if (lower.includes('sinal')) return <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />;
    
    // Embalagens e caixas
    if (lower.includes('caixa') || lower.includes('embalagem')) return <Box className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600" />;
    if (lower.includes('sacola')) return <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />;
    
    // Camisetas e brindes
    if (lower.includes('camiseta') || lower.includes('camisa')) return <Shirt className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600" />;
    if (lower.includes('brinde')) return <Gift className="w-5 h-5 lg:w-6 lg:h-6 text-pink-600" />;
    if (lower.includes('caneca')) return <Coffee className="w-5 h-5 lg:w-6 lg:h-6 text-brown-500" />;
    
    // Empresarial
    if (lower.includes('corporativ') || lower.includes('empresa')) return <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-slate-600" />;
    if (lower.includes('apresenta')) return <Briefcase className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" />;
    
    // Veículos
    if (lower.includes('veículo') || lower.includes('veiculo') || lower.includes('carro')) return <Car className="w-5 h-5 lg:w-6 lg:h-6 text-blue-700" />;
    
    // Premium
    if (lower.includes('premium') || lower.includes('luxo')) return <Crown className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" />;
    if (lower.includes('especial')) return <Gem className="w-5 h-5 lg:w-6 lg:h-6 text-violet-600" />;
    
    // Personalizados
    if (lower.includes('personaliz')) return <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-fuchsia-500" />;
    
    // Cores baseadas em hash para itens sem match
    const colors = ['text-blue-500', 'text-emerald-500', 'text-violet-500', 'text-rose-500', 'text-amber-500', 'text-cyan-500', 'text-pink-500', 'text-indigo-500'];
    const icons = [Star, Heart, Sparkles, Zap, Gem, Crown, Award, Tag];
    const hash = subcategory.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const IconComponent = icons[hash % icons.length];
    const colorClass = colors[hash % colors.length];
    
    return <IconComponent className={`w-5 h-5 lg:w-6 lg:h-6 ${colorClass}`} />;
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setViewMode('subcategories');
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setViewMode('products');
  };

  const handleBackToCategories = () => {
    setViewMode('categories');
    setSearchTerm("");
    setSelectedCategory("Todos");
    setSelectedSubcategory(null);
  };

  const handleBackToSubcategories = () => {
    setViewMode('subcategories');
    setSelectedSubcategory(null);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProductForVariation(product);
    setVariationDialogOpen(true);
    // Reset states
    setSelectedVariationId(null);
    setSelectedQuantity("1");
    setSelectedFinishings([]);
    setCustomDescription("");
    setDimensions({ width: "", height: "" });

    // Set base price for calculations
    setCurrentBasePrice(product.price);
    
    // For meter-based products, start with empty total (will be calculated from dimensions)
    const pricingMode = (product as any)?.pricing_mode;
    if (pricingMode === 'medidor') {
      setSelectedTotal("");
    } else if (!product.variations || product.variations.length === 0) {
      // For regular products without variations, pre-fill the price
      setSelectedTotal(product.price.toFixed(2));
    } else {
      setCurrentBasePrice(0);
      setSelectedTotal("");
    }
  };

  // Clean variation name helper
  const cleanVariationName = (name: string) => {
    return name.replace(/\s*\(.*?\)\s*/g, '').trim();
  };

  const handleConfirmAddItem = () => {
    if (!selectedProductForVariation) return;

    const quantity = parseInt(selectedQuantity);
    const total = parseFloat(selectedTotal);

    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    if (isNaN(total) || total < 0) {
      toast.error("Preço inválido");
      return;
    }

    const finalUnitPrice = total / quantity;
    const pricingMode = (selectedProductForVariation as any)?.pricing_mode || 'quantity';

    // Meter-based pricing - requires dimensions (supports both old 'meter' and new 'medidor' values)
    if (pricingMode === 'medidor' || pricingMode === 'meter' || selectedProductForVariation.category === 'Comunicação Visual') {
      if (!dimensions.width || !dimensions.height) {
        toast.error("Informe as medidas (Largura e Altura)");
        return;
      }

      const productWithOverriddenPrice = {
        ...selectedProductForVariation,
        price: finalUnitPrice
      };

      addToCart(productWithOverriddenPrice, quantity, undefined, {
        dimensions: `${dimensions.width}x${dimensions.height}m`,
        finishing: selectedFinishings.join(', '),
        customDescription: customDescription
      });

      toast.success("Item adicionado!");
      setVariationDialogOpen(false);
      return;
    }

    // Gráfica products - variations + finishing/desc
    if (selectedProductForVariation.category === 'Gráfica') {
      if (selectedVariationId) {
        const variation = selectedProductForVariation.variations?.find(v => v.id === selectedVariationId);
        if (variation) {
          const productWithOverriddenPrice = {
            ...selectedProductForVariation,
            price: finalUnitPrice
          };

          addToCart(productWithOverriddenPrice, quantity, undefined, {
            variationNameOverride: cleanVariationName(variation.name),
            finishing: selectedFinishings.join(', '),
            customDescription: customDescription
          });
          toast.success("Item adicionado!");
          setVariationDialogOpen(false);
          return;
        }
      }

      // No variations
      if (!selectedProductForVariation.variations || selectedProductForVariation.variations.length === 0) {
        addToCart({
          ...selectedProductForVariation,
          price: finalUnitPrice
        }, quantity, undefined, {
          finishing: selectedFinishings.join(', '),
          customDescription: customDescription
        });
        toast.success("Item adicionado!");
        setVariationDialogOpen(false);
        return;
      }

      toast.error("Selecione uma opção");
      return;
    }

    // Standard variation selection
    if (selectedVariationId) {
      const variation = selectedProductForVariation.variations?.find(v => v.id === selectedVariationId);
      if (variation) {
        const productWithOverriddenPrice = {
          ...selectedProductForVariation,
          price: finalUnitPrice
        };

        addToCart(productWithOverriddenPrice, quantity, undefined, {
          variationNameOverride: cleanVariationName(variation.name)
        });
        toast.success("Item adicionado!");
        setVariationDialogOpen(false);
        return;
      }
    }

    // No variations - add directly
    if (!selectedProductForVariation.variations || selectedProductForVariation.variations.length === 0) {
      addToCart({
        ...selectedProductForVariation,
        price: finalUnitPrice
      }, quantity);
      toast.success("Item adicionado!");
      setVariationDialogOpen(false);
      return;
    }

    toast.error("Selecione uma opção");
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomer(id);
    setCustomerDialogOpen(false);
    toast.success("Cliente selecionado");
  };

  const handleAddNewCustomer = () => {
    if (!newCustomerName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const customerName = newCustomerName.trim();
    const customerPhone = newCustomerPhone;
    
    addCustomer({
      name: customerName,
      phone: customerPhone,
      email: '',
      doc: ''
    });
    
    // After adding, find and select by name (customers list will refresh)
    setTimeout(() => {
      const found = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (found) setSelectedCustomer(found.id);
    }, 500);
    
    setNewCustomerName("");
    setNewCustomerPhone("");
    setCustomerDialogOpen(false);
  };

  const handleFinishSale = (method: 'cash' | 'pix' | 'card') => {
    if (cart.length === 0) return;

    const total = cartTotal;
    const paidInput = amountPaid === "" ? total : parseFloat(amountPaid.replace(',', '.'));
    const paid = isNaN(paidInput) ? 0 : paidInput;
    const remaining = Math.max(0, total - paid);
    const status = remaining > 0 ? (paid === 0 ? 'pending' : 'partial') : 'paid';

    setLastSaleTotal(total);
    setLastSaleItems([...cart]);
    setLastSalePaymentMethod(method);
    setLastSaleAmountPaid(paid);
    setLastSaleRemaining(remaining);
    setLastSaleInstallments(installments);

    const customer = customers.find(c => c.id === selectedCustomer);
    setLastSaleCustomer(customer ? { name: customer.name } : null);
    setLastSaleDate(new Date());

    const seller = users.find(u => u.id === selectedSeller);
    setLastSaleSeller(seller ? seller.name : null);

    // Check if we're editing an existing order
    if (editingOrderId) {
      setLastSaleId(editingOrderId);
      
      // Create payments array - if installments > 1, create all installment entries
      let paymentsArray: any[] = [];
      if (paid > 0) {
        paymentsArray.push({
          id: Math.random().toString(36).substr(2, 9),
          amount: paid,
          date: new Date().toISOString(),
          method: method
        });
      }
      
      // Add pending installments if there's remaining amount and installments > 1
      if (remaining > 0 && installments > 1) {
        const installmentValue = remaining / installments;
        for (let i = 0; i < installments; i++) {
          paymentsArray.push({
            id: Math.random().toString(36).substr(2, 9),
            amount: installmentValue,
            date: '', // Empty date means pending
            method: null // null method means not paid yet
          });
        }
      }

      updateOrder({
        id: editingOrderId,
        data: {
          customerId: customer?.id || null,
          customerName: customer?.name || "Consumidor Final",
          items: [...cart],
          total: total,
          paymentStatus: status,
          amountPaid: paid,
          remainingAmount: remaining,
          payments: paymentsArray,
          paymentMethod: remaining > 0 && installments > 1 ? 'card' : method, // Use 'card' for installments
          sellerId: selectedSeller,
          sellerName: seller?.name
        }
      });

      toast.success("Pedido Atualizado!", {
        description: `Pedido #${editingOrderId} foi atualizado com sucesso.`,
      });
      
      setEditingOrderId(null);
    } else {
      const newOrderId = (Math.floor(Math.random() * 9000) + 1000).toString();
      setLastSaleId(newOrderId);

      // Create payments array - if installments > 1, create all installment entries
      let paymentsArray: any[] = [];
      if (paid > 0) {
        paymentsArray.push({
          id: Math.random().toString(36).substr(2, 9),
          amount: paid,
          date: new Date().toISOString(),
          method: method
        });
      }
      
      // Add pending installments if there's remaining amount and installments > 1
      if (remaining > 0 && installments > 1) {
        const installmentValue = remaining / installments;
        for (let i = 0; i < installments; i++) {
          paymentsArray.push({
            id: Math.random().toString(36).substr(2, 9),
            amount: installmentValue,
            date: '', // Empty date means pending
            method: null // null method means not paid yet
          });
        }
      }

      addOrder({
        id: newOrderId,
        customerId: customer?.id || null,
        customerName: customer?.name || "Consumidor Final",
        items: [...cart],
        total: total,
        status: 'production',
        paymentStatus: status,
        amountPaid: paid,
        remainingAmount: remaining,
        payments: paymentsArray,
        paymentMethod: remaining > 0 && installments > 1 ? 'card' : method, // Use 'card' for installments
        createdAt: new Date().toISOString(),
        description: 'Venda Balcão',
        sellerId: selectedSeller,
        sellerName: seller?.name
      });

      // Send notifications
      const customerNameForNotification = customer?.name || "Consumidor Final";
      notifyNewSale(newOrderId, customerNameForNotification, total, seller?.name);
      
      if (remaining > 0) {
        notifyPendingPayment(newOrderId, customerNameForNotification, remaining);
      }

      toast.success(remaining > 0 ? "Venda Parcial Registrada!" : "Venda Finalizada!", {
        description: `Pago: R$ ${paid.toFixed(2)} | Restante: R$ ${remaining.toFixed(2)}`,
      });
    }

    setPaymentDialogOpen(false);
    clearCart();
    setSelectedCustomer("");
    setAmountPaid("");
    setInstallments(1);
    setReceiptDialogOpen(true);
  };

  // Quick Sale
  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setQuickSaleAmount("");
      return;
    }
    if (val === 'back') {
      setQuickSaleAmount(prev => prev.slice(0, -1));
      return;
    }
    if (val === '.' && quickSaleAmount.includes('.')) return;
    if (quickSaleAmount.includes('.')) {
      const parts = quickSaleAmount.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }
    setQuickSaleAmount(prev => prev + val);
  };

  const handleQuickAdd = () => {
    const amount = parseFloat(quickSaleAmount.replace(',', '.'));
    const qty = parseInt(quickSaleQuantity) || 1;

    if (!quickSaleDesc.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    addToCart({
      id: 'quick-' + Date.now(),
      name: quickSaleDesc,
      price: amount,
      stock: 9999,
      type: 'service',
      category: 'Rápido',
      subcategory: 'Balcão'
    }, qty);

    if (quickSaleCustomer) {
      const existingCustomer = customers.find(c => c.name.toLowerCase() === quickSaleCustomer.toLowerCase());
      if (existingCustomer) {
        setSelectedCustomer(existingCustomer.id);
      } else {
        const customerName = quickSaleCustomer.trim();
        addCustomer({
          name: customerName,
          phone: '',
          email: '',
          doc: ''
        });
        // Select after data refresh
        setTimeout(() => {
          const found = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
          if (found) setSelectedCustomer(found.id);
        }, 500);
      }
    }

    setQuickSaleAmount("");
    setQuickSaleDesc("");
    setQuickSaleQuantity("1");
    setQuickSaleCustomer("");
    setQuickSaleDialogOpen(false);
    toast.success("Item adicionado!");
  };

  // Print function from Max-PDV
  const handlePrint = (type: 'receipt' | 'order' | 'quote' | 'production') => {
    const getPaymentMethodLabel = (method: 'cash' | 'pix' | 'card' | null): string => {
      const labels: Record<string, string> = { cash: 'Dinheiro', pix: 'PIX', card: 'Cartão' };
      return method ? labels[method] || method : 'Não informado';
    };

    const orderData = {
      id: type === 'quote' ? Math.floor(Math.random() * 10000).toString() : (lastSaleId || '0000'),
      createdAt: (type === 'quote' ? new Date() : lastSaleDate || new Date()).toISOString(),
      customerName: type === 'quote' ? (customers.find(c => c.id === selectedCustomer)?.name || "Consumidor Final") : (lastSaleCustomer?.name || "Consumidor Final"),
      items: type === 'quote' ? cart : lastSaleItems,
      total: type === 'quote' ? cartTotal : lastSaleTotal,
      sellerName: type === 'quote' ? users.find(u => u.id === selectedSeller)?.name : lastSaleSeller,
      paymentMethod: type === 'quote' ? null : lastSalePaymentMethod,
      amountPaid: type === 'quote' ? 0 : lastSaleAmountPaid,
      remaining: type === 'quote' ? 0 : lastSaleRemaining,
      installments: type === 'quote' ? 1 : lastSaleInstallments,
      getPaymentMethodLabel,
    };

    const width = type === 'receipt' ? 400 : 800;
    const printWindow = window.open('', '', `height=600,width=${width}`);
    if (!printWindow) return;

    const title = type === 'order' ? 'PEDIDO' : type === 'production' ? 'ORDEM DE PRODUÇÃO' : type === 'quote' ? 'ORÇAMENTO' : 'RECIBO';
    const showPrices = type !== 'production';

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} #${orderData.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              font-size: ${type === 'receipt' ? '12px' : '14px'};
              max-width: ${type === 'receipt' ? '300px' : '100%'};
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed #000; }
            .border-t { border-top: 1px dashed #000; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; }
            .header-section { margin-bottom: 20px; text-align: center; }
            .info-section { margin-bottom: 20px; }
            .total-section { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; }
            .box { border: 2px solid #000; padding: 15px; margin-top: 8px; font-size: 16px; font-weight: bold; background: #f8f9fa; }
            .finishing-box { border: 2px solid #333; padding: 8px 12px; margin-top: 8px; font-size: 15px; font-weight: bold; background: #eee; display: inline-block; }
            .action-bar { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px; }
            .action-btn { background: #3b82f6; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .action-btn.print { background: #22c55e; }
            .action-btn.close { background: #ef4444; }
            @media print { .action-bar { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="action-bar">
            <button class="action-btn print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="action-btn close" onclick="window.close()">✕ Fechar</button>
          </div>
    `);

    // Header
    const vendasPhones = [companySettings.phone, cloudSettings?.phone2].filter(Boolean).join(' | ');
    printWindow.document.write(`
      <div class="header-section">
        ${companySettings.logoUrl 
          ? `<img src="${companySettings.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;" />` 
          : `<div class="font-bold" style="font-size: 1.2em;">${companySettings.name}</div>`}
        ${companySettings.cnpj ? `<div style="font-size: 0.9em;">CNPJ: ${companySettings.cnpj}</div>` : ''}
        <div>${companySettings.address || ''}</div>
        <div>${vendasPhones}</div>
        <div style="margin-top: 10px; font-weight: bold; font-size: 1.5em;">${title}</div>
      </div>
    `);

    // Info
    printWindow.document.write(`
      <div class="info-section border-b" style="padding-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <div>
            <div><strong>Data:</strong> ${new Date(orderData.createdAt).toLocaleString('pt-BR')}</div>
            <div><strong>Referência:</strong> #${orderData.id}</div>
            ${type === 'quote' ? '<div style="font-size: 0.8em; margin-top: 5px;">Válido por 7 dias</div>' : ''}
          </div>
          <div class="text-right">
            <div><strong>Cliente:</strong> ${orderData.customerName}</div>
            ${orderData.sellerName ? `<div><strong>Vendedor:</strong> ${orderData.sellerName}</div>` : ''}
          </div>
        </div>
      </div>
    `);

    // Content
    if (type === 'receipt') {
      printWindow.document.write('<div class="font-bold mb-2">ITENS</div>');
      orderData.items.forEach(item => {
        printWindow.document.write(`
          <div class="mb-2">
            <div class="font-bold">${item.quantity}x ${item.name}</div>
            ${item.variationName ? `<div style="font-size: 0.9em;">${item.variationName}</div>` : ''}
            ${showPrices ? `<div class="text-right">R$ ${item.total.toFixed(2)}</div>` : ''}
          </div>
        `);
      });
    } else {
      printWindow.document.write(`
        <table>
          <thead>
            <tr>
              <th style="width: 60%">Item / Detalhes</th>
              <th style="width: 10%; text-align: center;">Qtd</th>
              ${showPrices ? '<th style="width: 15%; text-align: right;">Unit.</th><th style="width: 15%; text-align: right;">Total</th>' : ''}
            </tr>
          </thead>
          <tbody>
      `);

      orderData.items.forEach(item => {
        const unitPrice = item.total / item.quantity;
        printWindow.document.write(`
          <tr>
            <td style="padding-bottom: 20px;">
              <div class="font-bold" style="font-size: 1.2em;">${item.name}</div>
              ${item.variationName ? `<div>${item.variationName}</div>` : ''}
              ${item.dimensions ? `<div style="font-size: 0.9em;">Medidas: ${item.dimensions}</div>` : ''}
              ${item.finishing ? `<div class="finishing-box">ACABAMENTO: ${item.finishing.toUpperCase()}</div>` : ''}
              ${item.customDescription ? `<div class="box">OBS: ${item.customDescription.toUpperCase()}</div>` : ''}
            </td>
            <td style="text-align: center; vertical-align: top; font-size: 1.2em; font-weight: bold;">${item.quantity}</td>
            ${showPrices ? `
              <td style="text-align: right; vertical-align: top;">R$ ${unitPrice.toFixed(2)}</td>
              <td style="text-align: right; vertical-align: top;">R$ ${item.total.toFixed(2)}</td>
            ` : ''}
          </tr>
        `);
      });

      printWindow.document.write('</tbody></table>');
    }

    // Totals
    if (showPrices) {
      const installmentValue = orderData.remaining > 0 && orderData.installments > 1 
        ? orderData.remaining / orderData.installments 
        : 0;
      
      printWindow.document.write(`
        <div class="total-section">
          <div>TOTAL: R$ ${orderData.total.toFixed(2)}</div>
          
          ${type !== 'quote' ? `
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc;">
              <div style="font-size: 0.9em; margin-bottom: 4px;">
                <strong>Forma de Pagamento:</strong> ${orderData.getPaymentMethodLabel(orderData.paymentMethod)}
              </div>
              
              ${orderData.amountPaid > 0 ? `
                <div style="font-size: 0.9em; color: #28a745; margin-top: 4px;">
                  <strong>Valor Pago:</strong> R$ ${orderData.amountPaid.toFixed(2)}
                </div>
              ` : ''}
              
              ${orderData.remaining > 0 ? `
                <div style="font-size: 0.9em; color: #dc3545; margin-top: 4px;">
                  <strong>Falta Pagar:</strong> R$ ${orderData.remaining.toFixed(2)}
                </div>
                ${orderData.installments > 1 ? `
                  <div style="font-size: 0.9em; color: #fd7e14; margin-top: 4px; padding: 6px; background: #fff8e1; border-radius: 4px;">
                    <strong>Parcelamento:</strong> ${orderData.installments}x de R$ ${installmentValue.toFixed(2)}
                  </div>
                ` : ''}
              ` : `
                <div style="font-size: 0.9em; color: #28a745; margin-top: 4px;">
                  <strong>PAGAMENTO TOTAL REALIZADO</strong>
                </div>
              `}
            </div>
          ` : ''}
        </div>
      `);
    }

    // Production fields
    if (type === 'production') {
      printWindow.document.write(`
        <div style="margin-top: 40px; border: 2px solid #000; padding: 10px;">
          <div style="font-weight: bold; margin-bottom: 40px;">OBSERVAÇÕES DE PRODUÇÃO:</div>
          <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
          <div style="border-bottom: 1px dotted #999; margin-bottom: 20px;"></div>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: space-between;">
          <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Produção</div>
          <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Visto Conferência</div>
        </div>
      `);
    } else {
      printWindow.document.write(`
        <div class="text-center py-2" style="margin-top: 20px; border-top: 1px dashed #000;">
          Obrigado pela preferência!
        </div>
      `);
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <MainLayout title="PDV - Nova Venda">
      {/* Quick Sale Dialog */}
      <Dialog open={quickSaleDialogOpen} onOpenChange={setQuickSaleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Venda Rápida</DialogTitle>
            <DialogDescription>Adicione um item avulso ao pedido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={quickSaleCustomer}
                onChange={(e) => setQuickSaleCustomer(e.target.value)}
                placeholder="Nome do cliente (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição do Item</Label>
              <Input
                value={quickSaleDesc}
                onChange={(e) => setQuickSaleDesc(e.target.value)}
                placeholder="Ex: Impressão Colorida A4"
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/3 space-y-2">
                <Label>Qtd.</Label>
                <Input
                  type="number"
                  value={quickSaleQuantity}
                  onChange={(e) => setQuickSaleQuantity(e.target.value)}
                  className="text-center font-bold h-14 text-xl"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Valor Unit. (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={quickSaleAmount}
                    onChange={(e) => setQuickSaleAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-2xl font-bold h-14 text-right"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14"
                    onClick={() => handleNumpadPress('back')}
                  >
                    <Delete className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-12 text-xl font-bold"
                  onClick={() => handleNumpadPress(num.toString())}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="destructive"
                className="h-12 text-lg font-bold"
                onClick={() => handleNumpadPress('C')}
              >
                C
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickSaleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickAdd} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              ADICIONAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-6 lg:h-[calc(100vh-140px)]">
        {/* Products Panel */}
        <div className="lg:col-span-2 flex flex-col min-h-0 order-1">
          {/* Search & Quick Entry */}
          <div className="flex gap-2 lg:gap-4 flex-shrink-0 mb-3 lg:mb-4">
            {viewMode === 'subcategories' && (
              <Button variant="outline" className="h-10 lg:h-12 px-2 lg:px-4 text-sm shrink-0" onClick={handleBackToCategories}>
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </Button>
            )}
            {viewMode === 'products' && !searchTerm && (
              <Button variant="outline" className="h-10 lg:h-12 px-2 lg:px-4 text-sm shrink-0" onClick={handleBackToSubcategories}>
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </Button>
            )}
            {viewMode === 'products' && searchTerm && (
              <Button variant="outline" className="h-10 lg:h-12 px-2 lg:px-4 text-sm shrink-0" onClick={handleBackToCategories}>
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </Button>
            )}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 lg:pl-10 h-10 lg:h-12 text-sm lg:text-lg"
              />
            </div>
            <Button 
              className="h-10 lg:h-12 px-3 lg:px-6 bg-green-600 hover:bg-green-700 font-bold text-xs lg:text-sm shrink-0"
              onClick={() => setQuickSaleDialogOpen(true)}
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" />
              <span className="hidden xs:inline">Rápida</span>
              <span className="hidden sm:inline lg:hidden"> </span>
              <span className="hidden lg:inline">Venda Rápida</span>
            </Button>
            <Button 
              className="h-10 lg:h-12 px-3 lg:px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs lg:text-sm shrink-0"
              onClick={() => setPurchaseDialogOpen(true)}
            >
              <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" />
              Compras
            </Button>
          </div>

          {/* Dynamic Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 lg:mb-4">
            <span 
              className={cn(
                "font-semibold",
                viewMode === 'categories' ? "text-foreground" : "hover:text-foreground cursor-pointer transition-colors"
              )}
              onClick={viewMode !== 'categories' ? handleBackToCategories : undefined}
            >
              PDV
            </span>
            {viewMode !== 'categories' && selectedCategory && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span 
                  className={cn(
                    "font-semibold",
                    viewMode === 'subcategories' ? "text-foreground" : "hover:text-foreground cursor-pointer transition-colors"
                  )}
                  onClick={viewMode === 'products' ? handleBackToSubcategories : undefined}
                >
                  {selectedCategory}
                </span>
              </>
            )}
            {viewMode === 'products' && selectedSubcategory && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-foreground">{selectedSubcategory}</span>
              </>
            )}
            {viewMode === 'products' && searchTerm && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-foreground">Busca: "{searchTerm}"</span>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* Categories Grid */}
            {viewMode === 'categories' && (
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="text-xs lg:text-sm"
                  >
                    <Settings className="w-4 h-4 mr-1 lg:mr-2" />
                    Gerenciar Categorias
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-4">
                  {categories.filter(c => c !== "Todos").map(cat => (
                    <Card
                      key={cat}
                      role="button"
                      tabIndex={0}
                      data-click-sound
                      className="p-3 lg:p-6 cursor-pointer hover:shadow-lg hover:border-hover/50 hover:bg-hover/10 transition-all flex flex-col items-center justify-center gap-2 lg:gap-3 min-h-[100px] lg:min-h-[140px]"
                      onClick={() => {
                        playClickSound();
                        handleCategorySelect(cat);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          playClickSound();
                          handleCategorySelect(cat);
                        }
                      }}
                    >
                      <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        {getCategoryIcon(cat)}
                      </div>
                      <h3 className="font-semibold text-center text-xs lg:text-base truncate max-w-full">{cat}</h3>
                      <span className="text-[10px] lg:text-xs text-muted-foreground">
                        {products.filter(p => p.category === cat).length} itens
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Subcategories Grid */}
            {viewMode === 'subcategories' && (
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm lg:text-lg font-bold text-primary truncate">{selectedCategory}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubcategoryManagerOpen(true)}
                    className="gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    Gerenciar
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-4">
                  {subcategories.map(sub => {
                    return (
                      <Card
                        key={sub}
                        role="button"
                        tabIndex={0}
                        data-click-sound
                        className="p-3 lg:p-4 cursor-pointer hover:shadow-lg hover:border-hover/50 hover:bg-hover/10 transition-all flex flex-col items-center justify-center min-h-[80px] lg:min-h-[100px]"
                        onClick={() => {
                          playClickSound();
                          handleSubcategorySelect(sub);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            playClickSound();
                            handleSubcategorySelect(sub);
                          }
                        }}
                      >
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 shadow-sm">
                          {getSubcategoryIcon(sub)}
                        </div>
                        <h3 className="font-semibold text-sm lg:text-base text-center line-clamp-2">{sub}</h3>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Products Grid (from subcategory or search) */}
            {viewMode === 'products' && (
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm lg:text-lg font-bold text-primary truncate">
                    {searchTerm ? `Busca: "${searchTerm}"` : selectedSubcategory}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductManagerOpen(true)}
                      className="gap-1"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Gerenciar Produtos</span>
                      <span className="sm:hidden">Produtos</span>
                    </Button>
                    <span className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                      {searchTerm ? filteredProducts.length : subcategoryProducts.length} produtos
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
                  {(searchTerm ? filteredProducts : subcategoryProducts).map(product => (
                    <Card
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      data-click-sound
                      className="p-2 lg:p-3 cursor-pointer hover:shadow-lg hover:border-hover/50 hover:bg-hover/10 transition-all flex flex-col min-h-[90px] lg:min-h-[120px]"
                      onClick={() => {
                        playClickSound();
                        handleProductClick(product);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          playClickSound();
                          handleProductClick(product);
                        }
                      }}
                    >
                      <span className="text-[10px] lg:text-xs text-muted-foreground uppercase truncate">{product.subcategory || product.category}</span>
                      <h3 className="font-semibold text-xs lg:text-sm mt-1 line-clamp-2 flex-1">{product.name}</h3>
                      <div className="flex items-center justify-between mt-1 lg:mt-2">
                        <div className="min-w-0 flex-1">
                          {product.variations && product.variations.length > 0 && (
                            <span className="text-[10px] lg:text-xs text-muted-foreground block">a partir de</span>
                          )}
                          <p className="text-primary font-bold text-xs lg:text-sm truncate">
                            R$ {product.variations && product.variations.length > 0 
                              ? Math.min(...product.variations.map(v => v.price)).toFixed(2)
                              : product.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 ml-1">
                          <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="bg-card rounded-xl border border-border shadow-soft flex flex-col min-h-[300px] max-h-[60vh] lg:max-h-none order-2">
          {/* Seller Selection */}
          <div className="p-2 lg:p-3 border-b border-border bg-muted/40">
            <Select value={selectedSeller} onValueChange={setSelectedSeller} disabled={authUser?.role === 'seller'}>
              <SelectTrigger className="h-9 lg:h-10 bg-background text-sm">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecione o Vendedor" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Selection */}
          <div className="p-2 lg:p-4 border-b border-border">
            <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 lg:h-12 text-sm">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedCustomer
                      ? <span className="text-primary font-semibold">{customers.find(c => c.id === selectedCustomer)?.name}</span>
                      : "Selecionar Cliente"}
                  </span>
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
                <Tabs defaultValue="list">
                  <DialogHeader>
                    <DialogTitle>Cliente</DialogTitle>
                  </DialogHeader>
                  <TabsList className="mt-2">
                    <TabsTrigger value="list">Buscar</TabsTrigger>
                    <TabsTrigger value="new">Novo</TabsTrigger>
                  </TabsList>
                  <TabsContent value="list" className="space-y-4">
                    <Input
                      placeholder="Buscar cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {customers
                        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
                        .map(customer => (
                          <div
                            key={customer.id}
                            className="p-3 hover:bg-muted rounded-lg cursor-pointer flex justify-between items-center border"
                            onClick={() => handleSelectCustomer(customer.id)}
                          >
                            <div>
                              <p className="font-semibold">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                            {selectedCustomer === customer.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="new" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone / WhatsApp</Label>
                      <Input
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <Button className="w-full" onClick={handleAddNewCustomer}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Cadastrar e Selecionar
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2 lg:space-y-3 min-h-[100px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
                <ShoppingCart className="h-10 w-10 lg:h-16 lg:w-16 mb-2 opacity-30" />
                <p className="text-sm lg:text-lg font-semibold">Carrinho Vazio</p>
                <p className="text-xs lg:text-sm">Toque nos produtos para adicionar</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    {/* Quantity controls */}
                    <div className="flex flex-col items-center gap-1 bg-background rounded-lg p-1 shrink-0">
                      <button 
                        className="w-7 h-7 flex items-center justify-center hover:bg-green-100 hover:text-green-600 rounded"
                        onClick={() => {
                          // Use the existing item's unit price to add quantity
                          const newQuantity = item.quantity + 1;
                          const newTotal = item.price * newQuantity;
                          useStore.getState().updateCartItem(item.id, { quantity: newQuantity, total: newTotal });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-sm">{item.quantity}</span>
                      <button 
                        className="w-7 h-7 flex items-center justify-center hover:bg-red-100 hover:text-red-600 rounded"
                        onClick={() => {
                          if (item.quantity > 1) {
                            // Decrease quantity instead of removing
                            const newQuantity = item.quantity - 1;
                            const newTotal = item.price * newQuantity;
                            useStore.getState().updateCartItem(item.id, { quantity: newQuantity, total: newTotal });
                          } else {
                            removeFromCart(item.id);
                          }
                        }}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      {item.variationName && (
                        <p className="text-xs text-primary font-medium truncate">{item.variationName}</p>
                      )}
                      {item.dimensions && (
                        <p className="text-xs text-muted-foreground truncate">Medidas: {item.dimensions}</p>
                      )}
                      {item.finishing && (
                        <p className="text-xs text-muted-foreground truncate">Acab.: {item.finishing}</p>
                      )}
                      {item.customDescription && (
                        <div className="text-xs text-muted-foreground italic mt-1 p-2 bg-background rounded border">
                          <span className="font-bold not-italic text-primary/80">OBS:</span> {item.customDescription}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Unit: R$ {item.price.toFixed(2)}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Total</span>
                        <p className="font-bold text-primary whitespace-nowrap">R$ {item.total.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button 
                          className="w-7 h-7 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 rounded bg-background border"
                          title="Editar item"
                          onClick={() => {
                            // Find the product and open the dialog for editing
                            const product = products.find(p => p.id === item.productId);
                            if (product) {
                              setSelectedProductForVariation(product);
                              setVariationDialogOpen(true);
                              setSelectedQuantity(item.quantity.toString());
                              setSelectedTotal(item.total.toFixed(2));
                              setCurrentBasePrice(item.price);
                              setSelectedFinishings(item.finishing ? item.finishing.split(', ').filter(Boolean) : []);
                              setCustomDescription(item.customDescription || "");
                              if (item.dimensions) {
                                const dims = item.dimensions.replace('m', '').split('x');
                                setDimensions({ width: dims[0] || "", height: dims[1] || "" });
                              } else {
                                setDimensions({ width: "", height: "" });
                              }
                              // Remove the item so user can re-add with changes
                              removeFromCart(item.id);
                            }
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          className="w-7 h-7 flex items-center justify-center hover:bg-red-100 hover:text-red-600 rounded bg-background border"
                          title="Remover item"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t border-border p-2 lg:p-4 space-y-2 lg:space-y-4 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-sm lg:text-lg font-medium">Total</span>
              <span className="text-lg lg:text-2xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
            </div>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-10 lg:h-14 text-base lg:text-xl font-bold" disabled={cart.length === 0}>
                  FINALIZAR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
                <DialogHeader className="p-5 pb-3 border-b pr-12 mt-2">
                  <DialogTitle className="text-xl font-bold text-center">Pagamento</DialogTitle>
                </DialogHeader>

                <div className="p-5 space-y-5">
                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Total da Venda</span>
                    <span className="text-2xl font-bold">R$ {cartTotal.toFixed(2)}</span>
                  </div>

                  {/* Entrada e Restante */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Valor de Entrada (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input
                          className="h-11 pl-9 text-base font-semibold bg-background"
                          placeholder={cartTotal.toFixed(2)}
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-orange-500">Restante a Pagar</Label>
                      <div className="h-11 flex items-center justify-center bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-200 dark:border-orange-500/20">
                        <span className="text-lg font-bold text-orange-500">
                          R$ {(() => {
                            const paid = amountPaid === "" ? cartTotal : parseFloat(amountPaid.replace(',', '.'));
                            const val = isNaN(paid) ? cartTotal : Math.max(0, cartTotal - paid);
                            return val.toFixed(2);
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parcelamento - só aparece quando cartão selecionado ou quando há restante */}
                  {(() => {
                    const paid = amountPaid === "" ? cartTotal : parseFloat(amountPaid.replace(',', '.'));
                    const remaining = isNaN(paid) ? 0 : Math.max(0, cartTotal - paid);
                    return remaining > 0 && (
                      <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-200 dark:border-orange-500/20">
                        <Label className="text-xs text-orange-600 font-medium">Parcelar Restante (R$ {remaining.toFixed(2)})</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setInstallments(Math.max(1, installments - 1))}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <div className="w-12 h-8 flex items-center justify-center bg-background rounded border font-bold">
                              {installments}x
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setInstallments(installments + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex-1 text-right">
                            <span className="text-sm text-muted-foreground">Parcela: </span>
                            <span className="font-bold text-orange-600">R$ {(remaining / installments).toFixed(2)}</span>
                          </div>
                        </div>
                        {installments > 1 && (
                          <p className="text-xs text-muted-foreground text-center">
                            {installments}x de R$ {(remaining / installments).toFixed(2)} = R$ {remaining.toFixed(2)} restante
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Forma de Pagamento */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-primary" />
                      Forma de Pagamento
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all",
                          paymentMethod === 'cash'
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-border bg-card hover:border-emerald-400 hover:bg-emerald-500/5"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg border",
                          paymentMethod === 'cash' ? "border-emerald-500/30 bg-emerald-500/20" : "border-border bg-muted/50"
                        )}>
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">Dinheiro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all",
                          paymentMethod === 'pix'
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-border bg-card hover:border-cyan-400 hover:bg-cyan-500/5"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg border",
                          paymentMethod === 'pix' ? "border-cyan-500/30 bg-cyan-500/20" : "border-border bg-muted/50"
                        )}>
                          <QrCode className="w-4 h-4 text-cyan-600" />
                        </div>
                        <span className="text-xs font-semibold text-cyan-600">PIX</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all",
                          paymentMethod === 'card'
                            ? "border-violet-500 bg-violet-500/10"
                            : "border-border bg-card hover:border-violet-400 hover:bg-violet-500/5"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg border",
                          paymentMethod === 'card' ? "border-violet-500/30 bg-violet-500/20" : "border-border bg-muted/50"
                        )}>
                          <CreditCard className="w-4 h-4 text-violet-600" />
                        </div>
                        <span className="text-xs font-semibold text-violet-600">Cartão</span>
                      </button>
                    </div>
                  </div>

                  {/* Confirmar */}
                  <Button
                    className="w-full h-12 text-base font-bold"
                    disabled={!paymentMethod}
                    onClick={() => paymentMethod && handleFinishSale(paymentMethod)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    CONFIRMAR PAGAMENTO
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="ghost" 
              className="w-full text-primary hover:bg-hover/10 h-9 lg:h-10 text-sm" 
              onClick={() => handlePrint('quote')} 
              disabled={cart.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Imprimir </span>Orçamento
            </Button>

            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:bg-destructive/10 h-9 lg:h-10 text-sm" 
              onClick={clearCart} 
              disabled={cart.length === 0}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-green-600">Sucesso!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6 space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <Check className="w-10 h-10" />
            </div>
            <div className="flex flex-col gap-3">
              <PrintButton 
                label="Imprimir Recibo" 
                onClick={() => handlePrint('receipt')} 
                variant="default"
                size="lg"
                iconSize={20}
                className="w-full h-12"
              />
              <div className="grid grid-cols-2 gap-3">
                <PrintButton 
                  label="Pedido" 
                  onClick={() => handlePrint('order')} 
                  size="lg"
                  className="h-12"
                />
                <PrintButton 
                  label="O.S." 
                  onClick={() => handlePrint('production')} 
                  size="lg"
                  className="h-12"
                />
              </div>
              <Button size="lg" variant="outline" className="w-full h-12" onClick={() => setReceiptDialogOpen(false)}>
                Nova Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variation/Product Configuration Dialog */}
      <Dialog open={variationDialogOpen} onOpenChange={setVariationDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-4">
          <DialogHeader className="shrink-0 pb-2 pr-12 mt-2">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="truncate text-base">{selectedProductForVariation?.name}</span>
              <Badge variant="secondary" className="text-base px-3 py-0.5 shrink-0 self-start sm:self-auto">
                R$ {parseFloat(selectedTotal || selectedProductForVariation?.price.toString() || '0').toFixed(2)}
              </Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">Configuração do produto</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 overflow-y-auto flex-1">
            {/* Variations - Only show if has variations */}
            {(selectedProductForVariation?.variations?.length || 0) > 0 && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase">
                  <ListFilter className="w-3 h-3" />
                  Opção
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {selectedProductForVariation?.variations?.map((v) => (
                    <Button
                      key={v.id}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-auto py-1.5 px-2 flex flex-col items-center gap-0.5 border text-xs",
                        selectedVariationId === v.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => {
                        const qty = parseFloat(selectedQuantity) || 1;
                        setSelectedVariationId(v.id);
                        setCurrentBasePrice(v.price);
                        setSelectedTotal((v.price * qty).toFixed(2));
                      }}
                    >
                      <span className={cn("font-medium truncate max-w-full", selectedVariationId === v.id ? "text-primary" : "")}>
                        {v.name}
                      </span>
                      <span className={cn("font-bold", selectedVariationId === v.id ? "text-primary" : "text-muted-foreground")}>
                        R$ {v.price.toFixed(2)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions - For meter-based pricing */}
            {(selectedProductForVariation && (
              (selectedProductForVariation as any).pricing_mode === 'medidor'
            )) && (
              <div className="space-y-1.5 pt-2 border-t border-dashed">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Medidas</Label>
                <div className="grid grid-cols-2 gap-3 bg-muted/50 p-3 rounded-lg">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Largura (m)</span>
                    <Input
                      placeholder="0.00"
                      value={dimensions.width}
                      onChange={(e) => {
                        const newWidth = e.target.value;
                        setDimensions({...dimensions, width: newWidth});
                        const width = parseFloat(newWidth) || 0;
                        const height = parseFloat(dimensions.height) || 0;
                        const qty = parseInt(selectedQuantity) || 1;
                        const total = width * height * currentBasePrice * qty;
                        setSelectedTotal(total.toFixed(2));
                      }}
                      className="h-10 text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Altura (m)</span>
                    <Input
                      placeholder="0.00"
                      value={dimensions.height}
                      onChange={(e) => {
                        const newHeight = e.target.value;
                        setDimensions({...dimensions, height: newHeight});
                        const width = parseFloat(dimensions.width) || 0;
                        const height = parseFloat(newHeight) || 0;
                        const qty = parseInt(selectedQuantity) || 1;
                        const total = width * height * currentBasePrice * qty;
                        setSelectedTotal(total.toFixed(2));
                      }}
                      className="h-10 text-base"
                    />
                  </div>
                </div>
                {/* Calculated result inline */}
                {parseFloat(dimensions.width) > 0 && parseFloat(dimensions.height) > 0 && (
                  <div className="flex items-center justify-between text-sm bg-primary/10 px-3 py-2 rounded">
                    <span className="text-muted-foreground">
                      {dimensions.width} × {dimensions.height} = {(parseFloat(dimensions.width) * parseFloat(dimensions.height)).toFixed(2)} m²
                    </span>
                    <span className="font-bold text-primary">Valor por m²: R$ {currentBasePrice.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Finishing & Observations - Stack on mobile, side by side on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-dashed">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase">
                  <Settings className="w-4 h-4" />
                  Acabamento
                </Label>
                <Popover open={finishingPopoverOpen} onOpenChange={setFinishingPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10 text-sm">
                      <span className="truncate">
                        {selectedFinishings.length > 0
                          ? selectedFinishings.join(', ')
                          : "Selecionar"}
                      </span>
                      <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[calc(100vw-3rem)] max-w-[320px] p-3 bg-popover"
                    align="center"
                    side="bottom"
                    sideOffset={8}
                  >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Opções Disponíveis</h4>
                      <span className="text-xs text-muted-foreground">{selectedFinishings.length} selecionados</span>
                    </div>
                    <div 
                      className="max-h-[200px] sm:max-h-[250px] overflow-y-auto space-y-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {finishingOptions.map((option, index) => {
                        const isSelected = selectedFinishings.includes(option);
                        const isSemAcabamento = option === "Sem Acabamento";
                        return (
                          <div
                            key={`${option}-${index}`}
                            className={cn(
                              "flex items-center gap-2 sm:gap-3 p-2 rounded-lg cursor-pointer select-none",
                              isSelected ? "bg-primary/10" : "hover:bg-muted"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isSemAcabamento) {
                                setSelectedFinishings([]);
                                setFinishingPopoverOpen(false);
                              } else {
                                if (isSelected) {
                                  setSelectedFinishings(prev => prev.filter(f => f !== option));
                                } else {
                                  setSelectedFinishings(prev => [...prev, option]);
                                }
                                setFinishingPopoverOpen(false);
                              }
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                            <span className="text-sm">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Novo acabamento..."
                        value={newFinishing}
                        onChange={(e) => setNewFinishing(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={() => {
                        if (newFinishing.trim()) {
                          const updatedOptions = [...finishingOptions, newFinishing.trim()];
                          setFinishingOptions(updatedOptions);
                          localStorage.setItem('finishingOptions', JSON.stringify(updatedOptions));
                          setSelectedFinishings([...selectedFinishings, newFinishing.trim()]);
                          setNewFinishing("");
                          toast.success("Acabamento adicionado!");
                          setFinishingPopoverOpen(false);
                        }
                      }}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              </div>

              {/* Observations */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase">
                  <PenLine className="w-4 h-4" />
                  Obs
                </Label>
                <Textarea
                  placeholder="Observações..."
                  className="h-10 min-h-[40px] resize-none text-sm"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Quantity & Total - Compact */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex flex-col gap-3">
                {/* Qtd and Valor Total row */}
                <div className="flex items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Qtd</Label>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        className="h-10 w-10 rounded-r-none p-0"
                        onClick={() => {
                          const val = parseInt(selectedQuantity) || 1;
                          if (val > 1) {
                            const newQty = val - 1;
                            const pricingMode = (selectedProductForVariation as any)?.pricing_mode;
                            if (pricingMode === 'medidor' && dimensions.width && dimensions.height) {
                              const width = parseFloat(dimensions.width) || 0;
                              const height = parseFloat(dimensions.height) || 0;
                              const total = width * height * currentBasePrice * newQty;
                              setSelectedTotal(total.toFixed(2));
                            } else {
                              const currentTotal = parseFloat(selectedTotal) || 0;
                              if (currentTotal > 0 && val > 0) {
                                const unitPrice = currentTotal / val;
                                setSelectedTotal((unitPrice * newQty).toFixed(2));
                              }
                            }
                            setSelectedQuantity(newQty.toString());
                          }
                        }}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        className="h-10 text-center text-lg font-bold rounded-none border-x-0 w-12"
                        value={selectedQuantity}
                        onChange={(e) => {
                          const newQty = e.target.value;
                          setSelectedQuantity(newQty);
                          const qty = parseInt(newQty) || 1;
                          const pricingMode = (selectedProductForVariation as any)?.pricing_mode;
                          if (pricingMode === 'medidor' && dimensions.width && dimensions.height) {
                            const width = parseFloat(dimensions.width) || 0;
                            const height = parseFloat(dimensions.height) || 0;
                            if (width > 0 && height > 0 && currentBasePrice > 0) {
                              const total = width * height * currentBasePrice * qty;
                              setSelectedTotal(total.toFixed(2));
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        className="h-10 w-10 rounded-l-none p-0"
                        onClick={() => {
                          const val = parseInt(selectedQuantity) || 1;
                          const newQty = val + 1;
                          const pricingMode = (selectedProductForVariation as any)?.pricing_mode;
                          if (pricingMode === 'medidor' && dimensions.width && dimensions.height) {
                            const width = parseFloat(dimensions.width) || 0;
                            const height = parseFloat(dimensions.height) || 0;
                            const total = width * height * currentBasePrice * newQty;
                            setSelectedTotal(total.toFixed(2));
                          } else {
                            const currentTotal = parseFloat(selectedTotal) || 0;
                            if (currentTotal > 0 && val > 0) {
                              const unitPrice = currentTotal / val;
                              setSelectedTotal((unitPrice * newQty).toFixed(2));
                            }
                          }
                          setSelectedQuantity(newQty.toString());
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium">Valor Total</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-lg sm:text-xl font-semibold">R$</span>
                      <Input
                        className="h-12 sm:h-14 pl-10 sm:pl-12 pr-2 sm:pr-4 text-right text-xl sm:!text-[1.75rem] leading-none font-bold text-primary border-2 border-primary/30 bg-primary/5"
                        value={selectedTotal}
                        onChange={(e) => {
                          const newTotal = e.target.value;
                          setSelectedTotal(newTotal);
                          const pricingMode = (selectedProductForVariation as any)?.pricing_mode;
                          if (pricingMode === 'medidor' && dimensions.width && dimensions.height) {
                            const width = parseFloat(dimensions.width) || 0;
                            const height = parseFloat(dimensions.height) || 0;
                            const qty = parseInt(selectedQuantity) || 1;
                            const area = width * height * qty;
                            if (area > 0) {
                              const total = parseFloat(newTotal) || 0;
                              const newPricePerM2 = total / area;
                              setCurrentBasePrice(newPricePerM2);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Add button full width on mobile */}
                <Button className="h-12 w-full text-base font-semibold" onClick={handleConfirmAddItem}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
      />

      {/* Category Manager Dialog */}
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />

      {/* Subcategory Manager Dialog */}
      <SubcategoryManagerDialog
        open={subcategoryManagerOpen}
        onOpenChange={setSubcategoryManagerOpen}
        category={selectedCategory}
        subcategories={subcategories}
      />

      {/* Product Manager Dialog */}
      <ProductManagerDialog
        open={productManagerOpen}
        onOpenChange={setProductManagerOpen}
        initialCategory={selectedCategory}
        initialSubcategory={selectedSubcategory}
      />
    </MainLayout>
  );
}
