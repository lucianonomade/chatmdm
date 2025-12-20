import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell, Check, CheckCheck, Trash2, Package, ShoppingCart, CreditCard, ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, NotificationType } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  low_stock: <Package className="h-4 w-4 text-warning" />,
  new_sale: <ShoppingCart className="h-4 w-4 text-success" />,
  pending_payment: <CreditCard className="h-4 w-4 text-destructive" />,
  order_status: <ClipboardList className="h-4 w-4 text-info" />,
};

const notificationColors: Record<NotificationType, string> = {
  low_stock: "border-l-warning",
  new_sale: "border-l-success",
  pending_payment: "border-l-destructive",
  order_status: "border-l-info",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    // Extract order ID from notification message
    const orderIdMatch = notification.message.match(/Pedido #(\d+)/);
    if (orderIdMatch) {
      const orderId = orderIdMatch[1];
      markAsRead(notification.id);
      setOpen(false);
      navigate(`/ordens-servico?order=${orderId}`);
    }
  };

  const TriggerButton = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  const NotificationContent = (isMobileDialog: boolean = false) => (
    <>
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        isMobileDialog && "pr-12" // Space for close button on mobile dialog
      )}>
        <h4 className="font-semibold">Notificações</h4>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "p-3 hover:bg-hover/10 transition-all duration-200 border-l-4 cursor-pointer hover:shadow-sm",
                  notificationColors[notification.type],
                  !notification.read && "bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notificationIcons[notification.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm",
                        !notification.read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {notifications.length > 0 && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-destructive"
            onClick={() => clearAllNotifications()}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar todas
          </Button>
        </div>
      )}
    </>
  );

  // Mobile: use Dialog centered
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {TriggerButton}
        </DialogTrigger>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-0 rounded-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Notificações</DialogTitle>
          </DialogHeader>
          {NotificationContent(true)}
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: use Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[calc(100vw-1rem)] p-0 z-50"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {NotificationContent(false)}
      </PopoverContent>
    </Popover>
  );
}
