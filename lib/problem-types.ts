export type ProblemFrontmatter = {
  title: string;
  aliases: string[];
  tags: string[];
  toc: string[];
  type: string[];
};

export type Problem = ProblemFrontmatter & {
  slug: string;
  content: string;
  kind: "problem" | "wiki";
  updatedAt: string;
  format?: "multiple-choice" | "short-answer";
  choices?: string[];
  correctChoiceIndexes?: number[];
  correctChoiceIndex?: number;
  explanation?: string;
  answer?: string;
};
