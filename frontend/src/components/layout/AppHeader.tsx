import { Bell, Search, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          {title && (
            <h2 className="text-lg font-medium text-foreground">{title}</h2>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Rechercher..." 
              className="w-64 pl-10 bg-secondary border-none"
            />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Link to="/notifications" className="text-xs text-primary underline">
                  Tout voir
                </Link>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 && (
                <DropdownMenuItem disabled>
                  Aucune notification
                </DropdownMenuItem>
              )}
              {notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem key={n.id} className="flex items-start gap-2 py-2">
                  {!n.is_read ? (
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary" />
                  ) : (
                    <Check size={14} className="text-muted-foreground mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                </DropdownMenuItem>
              ))}
              {notifications.length > 5 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/notifications" className="text-primary">
                      Voir toutes les notifications
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User size={16} className="text-primary-foreground" />
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}
