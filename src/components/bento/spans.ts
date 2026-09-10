export const SPANS = {
  hero: "col-span-4 row-span-4 lg:col-span-7 lg:row-span-4",
  eduRight: "col-span-4 row-span-2 lg:col-span-5 lg:row-span-2",
  quarter: "col-span-2 row-span-2 lg:col-span-3 lg:row-span-2",
  winTile: "col-span-2 row-span-2 lg:col-span-2 lg:row-span-2",
  subTile: "col-span-1 row-span-1",
  third: "col-span-4 row-span-2 lg:col-span-4 lg:row-span-2",
  half: "col-span-4 row-span-2 lg:col-span-6 lg:row-span-2",
  wide: "col-span-4 row-span-2 lg:col-span-12 lg:row-span-2",
  wideShort: "col-span-4 row-span-1 lg:col-span-12 lg:row-span-1",
  tile: "col-span-2 row-span-1 lg:col-span-1 lg:row-span-1",
} as const;

export type SpanName = keyof typeof SPANS;
