import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Box, 
  ScanBarcode, 
  QrCode, 
  Users, 
  Warehouse,
  Package,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Inventory", href: "/inventory", icon: Warehouse },
  { name: "Sales", href: "/sales", icon: ScanBarcode },
  { name: "Reports", href: "/reports", icon: Package },
  { name: "Associates", href: "/associates", icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-surface shadow-lg border-r border-border">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-secondary flex items-center">
          <Box className="mr-3 text-primary" size={24} />
          InventoryPro
        </h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary hover:bg-muted"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <Icon className="mr-3" size={18} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className="absolute bottom-0 w-64 p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Users className="text-primary-foreground" size={16} />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary truncate">
                {(user as any)?.firstName} {(user as any)?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {(user as any)?.role || 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="ml-2 p-1.5 h-auto"
            title="Log out"
            data-testid="button-logout"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
