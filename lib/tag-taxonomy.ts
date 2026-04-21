export const AREA_FIELD_TAGS = {
  循環器: [
    "心不全",
    "不整脈",
    "虚血性心疾患",
    "弁膜症",
    "心筋症",
    "心膜疾患",
    "先天性心疾患",
    "大動脈疾患",
    "末梢動脈疾患",
    "静脈疾患",
    "リンパ管疾患",
    "血圧疾患",
    "腫瘍性心疾患",
    "循環器外傷",
  ],
  呼吸器: [
    "呼吸器感染症",
    "アレルギー性呼吸器疾患",
    "膠原病性呼吸器疾患",
    "実質性肺疾患",
    "肺・気管支の形態異常",
    "肺循環障害",
    "異常呼吸",
    "肺腫瘍性疾患",
    "胸膜疾患",
    "縦郭疾患",
    "横隔膜疾患",
    "呼吸器外傷",
  ],
  その他の科目: [
    "臨床技能１",
    "臨床技能２"
  ]
} as const;

export type AreaTag = keyof typeof AREA_FIELD_TAGS;

export function getManagedTagPaths(): string[] {
  return Object.entries(AREA_FIELD_TAGS).flatMap(([area, fields]) =>
    fields.map((field) => `${area}/${field}`),
  );
}

export function hasRequiredAreaFieldSelection(selectedTags: string[]): boolean {
  const selectedSet = new Set(selectedTags);

  for (const [area, fields] of Object.entries(AREA_FIELD_TAGS)) {
    if (!selectedSet.has(area)) {
      continue;
    }

    if (fields.some((field) => selectedSet.has(field))) {
      return true;
    }
  }

  return false;
}
