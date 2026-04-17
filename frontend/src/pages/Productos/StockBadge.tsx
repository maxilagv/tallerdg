import { Badge } from "../../shared/ui/Badge";

interface StockBadgeProps {
  actual: number | string;
  minimo: number | string;
}

export function StockBadge({ actual, minimo }: StockBadgeProps) {
  const stockActual = Number(actual) || 0;
  const stockMinimo = Number(minimo) || 0;

  if (stockActual <= 0) {
    return <Badge variant="red">Sin stock</Badge>;
  }

  if (stockActual <= stockMinimo) {
    return <Badge variant="yellow">Stock bajo</Badge>;
  }

  if (stockActual <= stockMinimo * 2) {
    return <Badge variant="orange">Poco stock</Badge>;
  }

  return <Badge variant="green">OK</Badge>;
}
