import type { CatalogObject } from '../types';

interface SearchBoxProps {
  query: string;
  results: CatalogObject[];
  selectedObjectId: string;
  onQueryChange: (query: string) => void;
  onSelectObject: (id: string) => void;
}

export function SearchBox({ query, results, selectedObjectId, onQueryChange, onSelectObject }: SearchBoxProps) {
  return (
    <section className="panel-section">
      <div className="section-heading">
        <h2>搜索天体</h2>
        <span>{results.length} 个匹配</span>
      </div>
      <input
        className="search-input"
        value={query}
        placeholder="银心 / Gaia / Orion / 参宿四"
        aria-label="搜索天体"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div className="result-list" role="listbox" aria-label="搜索结果">
        {results.map((object) => (
          <button
            key={object.id}
            type="button"
            className={object.id === selectedObjectId ? 'result-row active' : 'result-row'}
            onClick={() => onSelectObject(object.id)}
          >
            <span className="result-name">{object.name}</span>
            <span className={`realism-pill ${object.realism}`}>{realismLabel(object.realism)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function realismLabel(realism: CatalogObject['realism']) {
  if (realism === 'measured') return '实测';
  if (realism === 'model') return '模型';
  return '艺术近似';
}
