import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Menu,
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  LogOut,
  Smartphone
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const getNavigationForRole = (role: string) => {
  const baseNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Sales", href: "/sales", icon: ShoppingCart },
    { name: "Mobile Sales", href: "/mobile-sales", icon: Smartphone },
  ];

  if (role === 'admin') {
    baseNavigation.push(
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Associates", href: "/associates", icon: Users }
    );
  }

  return baseNavigation;
};

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const navigation = getNavigationForRole((user as any)?.role || 'associate');

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 w-9 p-0"
            data-testid="mobile-menu-trigger"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] sm:w-[300px]">
          <div className="flex flex-col h-full">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2 px-2 py-4 border-b">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-secondary">InventoryPro</h1>
                <p className="text-xs text-muted-foreground">Mobile Dashboard</p>
              </div>
            </div>

            {/* User Info */}
            <div className="px-2 py-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-accent-foreground">
                    {((user as any)?.firstName?.[0] || '') + ((user as any)?.lastName?.[0] || '')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-secondary truncate">
                    {(user as any)?.firstName} {(user as any)?.lastName}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant={(user as any)?.role === 'admin' ? "default" : "secondary"} className="text-xs">
                      {(user as any)?.role === 'admin' ? 'Admin' : 'Associate'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  
                  return (
                    <li key={item.name}>
                      <Link href={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={`w-full justify-start h-12 ${
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent hover:text-accent-foreground"
                          }`}
                          onClick={() => setOpen(false)}
                          data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {item.name}
                        </Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Logout */}
            <div className="px-2 py-4 border-t">
              <Button 
                variant="outline" 
                className="w-full justify-start h-12"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                data-testid="mobile-logout-button"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}