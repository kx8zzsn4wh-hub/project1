import { Badge } from "@/components/ui/badge";
import { toIndependentTagList } from "@/lib/independent-tags";

type IndependentTagBadgesProps = {
  slug: string;
  tags: string[];
  tagPaths?: string[];
  variant?: "default" | "secondary" | "outline";
  hashPrefix?: boolean;
};

export function IndependentTagBadges({
  slug,
  tags,
  tagPaths = [],
  variant = "outline",
  hashPrefix = true,
}: IndependentTagBadgesProps) {
  const independentTags = toIndependentTagList(tags, tagPaths);

  if (independentTags.length === 0) {
    return null;
  }

  return (
    <>
      {independentTags.map((tag) => (
        <Badge key={`${slug}-independent-tag-${tag}`} variant={variant}>
          {hashPrefix ? `#${tag}` : tag}
        </Badge>
      ))}
    </>
  );
}
