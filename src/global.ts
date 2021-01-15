export interface Article {
  readonly id: string;
  readonly title: string | null;
  readonly content: string | null;
  readonly contentPreview: string | null;
  readonly image: string | null;
}