import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, FileText, Receipt, ClipboardList, Share2 } from "lucide-react";
import { ServiceOrder } from "@/lib/store";
import { CompanySettings } from "@/lib/types";
import { sendOrderViaWhatsApp } from "@/lib/whatsappUtils";

interface WhatsAppButtonProps {
  order: ServiceOrder;
  companySettings: CompanySettings;
  customerPhone?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  showLabel?: boolean;
  className?: string;
}

export function WhatsAppButton({ 
  order, 
  companySettings, 
  customerPhone,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  className
}: WhatsAppButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={`text-success hover:text-success ${className || ''}`}>
          <MessageCircle className="h-4 w-4" />
          {showLabel && <span className="ml-2">WhatsApp</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => sendOrderViaWhatsApp(order, 'receipt', companySettings, customerPhone)}>
          <Receipt className="h-4 w-4 mr-2" />
          Enviar Recibo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sendOrderViaWhatsApp(order, 'order', companySettings, customerPhone)}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Enviar Pedido
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sendOrderViaWhatsApp(order, 'quote', companySettings, customerPhone)}>
          <FileText className="h-4 w-4 mr-2" />
          Enviar Orçamento
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface WhatsAppShareDialogProps {
  order: ServiceOrder;
  companySettings: CompanySettings;
  customerPhone?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppShareDialog({
  order,
  companySettings,
  customerPhone,
  open,
  onOpenChange
}: WhatsAppShareDialogProps) {
  const options = [
    { type: 'receipt' as const, label: 'Recibo', icon: Receipt, description: 'Comprovante de pagamento' },
    { type: 'order' as const, label: 'Pedido', icon: ClipboardList, description: 'Detalhes do pedido completo' },
    { type: 'quote' as const, label: 'Orçamento', icon: FileText, description: 'Proposta de preço (válida 7 dias)' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" />
            Enviar via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo de documento para enviar ao cliente
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-2 py-4">
          {options.map(option => (
            <Button
              key={option.type}
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                sendOrderViaWhatsApp(order, option.type, companySettings, customerPhone);
                onOpenChange(false);
              }}
            >
              <option.icon className="h-5 w-5 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
