export interface Article {
  readonly id: string;
  readonly title: string | null;
  readonly content: string | null;
  readonly image: string | null;
}