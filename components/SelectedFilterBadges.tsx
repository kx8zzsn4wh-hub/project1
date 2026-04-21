import { Badge } from "@/components/ui/badge";

type SelectedFilterBadgesProps = {
  label: string;
  items: string[];
  onRemove: (value: string) => void;
  onClear: () => void;
  badgeVariant?: "default" | "secondary" | "outline";
};

export function SelectedFilterBadges({
  label,
  items,
  onRemove,
  onClear,
  badgeVariant = "outline",
}: SelectedFilterBadgesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600">{label}</p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-zinc-600 underline-offset-2 hover:underline"
        >
          すべて解除
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item} type="button" onClick={() => onRemove(item)}>
            <Badge variant={badgeVariant}>{item} x</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
