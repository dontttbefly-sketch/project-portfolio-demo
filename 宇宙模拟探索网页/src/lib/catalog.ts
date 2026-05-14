import type { CatalogObject } from '../types';

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function searchableText(object: CatalogObject): string {
  return normalize(
    [
      object.name,
      object.type,
      object.description,
      object.realism,
      ...object.aliases,
      ...object.facts,
      ...object.sources.map((source) => source.label),
    ].join(' '),
  );
}

export function searchCatalog(catalog: CatalogObject[], query: string): CatalogObject[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return catalog;
  }

  return catalog
    .map((object) => {
      const text = searchableText(object);
      const exactNameMatch = normalize(object.name) === normalizedQuery ? 3 : 0;
      const aliasPrefixMatch = object.aliases.some((alias) => normalize(alias).startsWith(normalizedQuery)) ? 3 : 0;
      const aliasMatch = object.aliases.some((alias) => normalize(alias).includes(normalizedQuery)) ? 2 : 0;
      const textMatch = text.includes(normalizedQuery) ? 1 : 0;
      return { object, score: exactNameMatch + aliasPrefixMatch + aliasMatch + textMatch };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.object.name.localeCompare(b.object.name, 'zh-CN'))
    .map((entry) => entry.object);
}

export function findObjectById(catalog: CatalogObject[], id: string): CatalogObject | undefined {
  return catalog.find((object) => object.id === id);
}
