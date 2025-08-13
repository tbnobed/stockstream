import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import MobileNav from "./mobile-nav";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSale?: () => void;
  onAddInventory?: () => void;
}

export default function Header({ title, subtitle, onNewSale, onAddInventory }: HeaderProps) {
  return (
    <header className="bg-surface shadow-sm border-b border-border px-4 md:px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <MobileNav />
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-secondary">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {onNewSale && (
            <Button 
              onClick={onNewSale}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
              data-testid="button-new-sale"
            >
              <Plus className="mr-0 md:mr-2" size={16} />
              <span className="hidden sm:inline">New Sale</span>
            </Button>
          )}
          {onAddInventory && (
            <Button 
              onClick={onAddInventory}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              size="sm"
              data-testid="button-add-inventory"
            >
              <Package className="mr-0 md:mr-2" size={16} />
              <span className="hidden sm:inline">Add Inventory</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
