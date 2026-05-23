import { Badge } from "@/components/ui/badge";
import {
  type InventoryHealth,
  inventoryHealthLabel,
} from "@/lib/inventory/health";
import { cn } from "@/lib/utils";

const healthVariant: Record<
  InventoryHealth,
  "success" | "warning" | "destructive"
> = {
  healthy: "success",
  low_stock: "warning",
  fully_reserved: "destructive",
};

type InventoryHealthBadgeProps = {
  health: InventoryHealth;
  className?: string;
};

export function InventoryHealthBadge({
  health,
  className,
}: InventoryHealthBadgeProps) {
  return (
    <Badge
      variant={healthVariant[health]}
      className={cn("font-normal", className)}
    >
      {inventoryHealthLabel[health]}
    </Badge>
  );
}
