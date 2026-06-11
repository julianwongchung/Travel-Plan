export function reorderItineraryItems<T extends { id: string; sort_order: number }>(
  items: T[],
  activeId: string,
  targetId: string,
): T[] {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) return items;

  const reordered = [...items];
  const [activeItem] = reordered.splice(activeIndex, 1);
  reordered.splice(targetIndex, 0, activeItem);

  return reordered.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}
