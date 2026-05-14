import type { GalaxyLayer } from '../types';

interface LayerPanelProps {
  layers: GalaxyLayer[];
  onToggleLayer: (id: string) => void;
}

export function LayerPanel({ layers, onToggleLayer }: LayerPanelProps) {
  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>图层控制</h2>
        <span>{layers.filter((layer) => layer.visible).length}/{layers.length}</span>
      </div>
      <div className="layer-list">
        {layers.map((layer) => (
          <label key={layer.id} className="layer-row">
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={() => onToggleLayer(layer.id)}
            />
            <span className="layer-swatch" style={{ background: layer.color }} />
            <span className="layer-copy">
              <strong>{layer.name}</strong>
              <small>{layer.description}</small>
            </span>
            <span className={`realism-pill ${layer.realism}`}>{realismLabel(layer.realism)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function realismLabel(realism: GalaxyLayer['realism']) {
  if (realism === 'measured') return '实测';
  if (realism === 'model') return '模型';
  return '艺术近似';
}
