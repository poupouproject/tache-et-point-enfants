import {
  Bed,
  Bike,
  BookOpen,
  Box,
  Brush,
  Candy,
  Cat,
  Clapperboard,
  Coins,
  Dog,
  Flower2,
  Gamepad2,
  Gift,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Trees,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/**
 * Icônes proposées pour les tâches et les récompenses. La clé est ce qui est
 * stocké en base — jamais le composant — pour que la bibliothèque d'icônes
 * reste remplaçable.
 */
export const ICONS: Record<string, LucideIcon> = {
  star: Star,
  utensils: Utensils,
  trash: Trash2,
  broom: Brush,
  bed: Bed,
  box: Box,
  shirt: Shirt,
  basket: ShoppingBasket,
  book: BookOpen,
  flower: Flower2,
  dog: Dog,
  cat: Cat,
  bike: Bike,
  sparkles: Sparkles,
  gift: Gift,
  gamepad: Gamepad2,
  film: Clapperboard,
  candy: Candy,
  trees: Trees,
  ticket: Ticket,
  trophy: Trophy,
  coins: Coins,
};

export const TASK_ICON_KEYS = [
  "star",
  "utensils",
  "trash",
  "broom",
  "bed",
  "box",
  "shirt",
  "basket",
  "book",
  "flower",
  "dog",
  "cat",
  "bike",
  "sparkles",
];

export const REWARD_ICON_KEYS = [
  "gift",
  "gamepad",
  "film",
  "candy",
  "trees",
  "ticket",
  "trophy",
  "sparkles",
  "star",
  "coins",
];

export function TaskIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Star;
  return <Icon className={className} aria-hidden />;
}
