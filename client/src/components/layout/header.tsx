import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSale?: () => void;
  onAddInventory?: () => void;
}

export default function Header({ title, subtitle, onNewSale, onAddInventory }: HeaderProps) {
  return (
    <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-secondary">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {onNewSale && (
            <Button 
              onClick={onNewSale}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-new-sale"
            >
              <Plus className="mr-2" size={16} />
              New Sale
            </Button>
          )}
          {onAddInventory && (
            <Button 
              onClick={onAddInventory}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-add-inventory"
            >
              <Package className="mr-2" size={16} />
              Add Inventory
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
