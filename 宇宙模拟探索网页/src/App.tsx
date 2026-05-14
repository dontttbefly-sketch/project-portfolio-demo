import { useMemo, useState } from 'react';
import { GalaxyScene } from './components/GalaxyScene';
import { LayerPanel } from './components/LayerPanel';
import { LearningPanel } from './components/LearningPanel';
import { SearchBox } from './components/SearchBox';
import { Toolbar } from './components/Toolbar';
import { cameraPresets } from './data/cameraPresets';
import { catalogObjects } from './data/catalog';
import { initialGalaxyLayers } from './data/layers';
import { learningCards } from './data/learningCards';
import { findObjectById, searchCatalog } from './lib/catalog';
import { toggleLayerVisibility } from './lib/layers';

export default function App() {
  const [layers, setLayers] = useState(initialGalaxyLayers);
  const [selectedObjectId, setSelectedObjectId] = useState('sun');
  const [activePresetId, setActivePresetId] = useState('solar-neighborhood');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedObject = useMemo(
    () => findObjectById(catalogObjects, selectedObjectId) ?? catalogObjects[0],
    [selectedObjectId],
  );

  const searchResults = useMemo(
    () => searchCatalog(catalogObjects, searchQuery).slice(0, 7),
    [searchQuery],
  );

  function selectObject(id: string) {
    setSelectedObjectId(id);
  }

  return (
    <main className="app-shell">
      <GalaxyScene
        layers={layers}
        selectedObjectId={selectedObject.id}
        activePresetId={activePresetId}
        onSelectObject={selectObject}
      />

      <Toolbar
        presets={cameraPresets}
        activePresetId={activePresetId}
        onSelectPreset={setActivePresetId}
      />

      <aside className="left-panel surface-panel" aria-label="图层与搜索">
        <SearchBox
          query={searchQuery}
          results={searchResults}
          selectedObjectId={selectedObject.id}
          onQueryChange={setSearchQuery}
          onSelectObject={selectObject}
        />
        <LayerPanel
          layers={layers}
          onToggleLayer={(id) => setLayers((current) => toggleLayerVisibility(current, id))}
        />
      </aside>

      <LearningPanel object={selectedObject} learningCards={learningCards} />

      <div className="status-strip" aria-live="polite">
        <span>自由探索模式</span>
        <span>缩放不会切换模式；细节只在肉眼可分辨时出现</span>
        <span>鼠标拖拽旋转 · 滚轮拉近 · WASD/QE 平移</span>
        <span>当前目标：{selectedObject.name}</span>
      </div>
    </main>
  );
}
