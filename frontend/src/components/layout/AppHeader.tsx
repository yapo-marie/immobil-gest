import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const unreadCount = 3; // Mock data

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
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-medium rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>

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
