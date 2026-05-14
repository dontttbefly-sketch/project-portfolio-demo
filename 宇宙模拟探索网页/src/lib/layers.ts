import type { GalaxyLayer } from '../types';

export function toggleLayerVisibility(layers: GalaxyLayer[], id: string): GalaxyLayer[] {
  if (!layers.some((layer) => layer.id === id)) {
    return layers;
  }

  return layers.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer));
}

export function getVisibleLayerIds(layers: GalaxyLayer[]): string[] {
  return layers.filter((layer) => layer.visible).map((layer) => layer.id);
}
