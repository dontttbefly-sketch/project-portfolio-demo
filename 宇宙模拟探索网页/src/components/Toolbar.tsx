import type { CameraPreset } from '../types';

interface ToolbarProps {
  presets: CameraPreset[];
  activePresetId: string;
  onSelectPreset: (id: string) => void;
}

export function Toolbar({ presets, activePresetId, onSelectPreset }: ToolbarProps) {
  return (
    <header className="top-toolbar surface-panel">
      <div className="brand-block">
        <span className="brand-kicker">Observable Universe Explorer</span>
        <h1>真实宇宙 3D 探索</h1>
      </div>
      <nav className="preset-tabs" aria-label="相机视角">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className={preset.id === activePresetId ? 'active' : ''}
            type="button"
            title={preset.description}
            onClick={() => onSelectPreset(preset.id)}
          >
            {preset.name}
          </button>
        ))}
      </nav>
    </header>
  );
}
