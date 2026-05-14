import type { CatalogObject, LearningCard } from '../types';
import { getCelestialDetailProfile } from '../lib/celestialDetail';
import {
  formatGalaxyScaleRenderability,
  formatScaleMeasurement,
  scaleKindLabel,
} from '../lib/celestialScale';

interface LearningPanelProps {
  object: CatalogObject;
  learningCards: LearningCard[];
}

export function LearningPanel({ object, learningCards }: LearningPanelProps) {
  const relatedCards = learningCards.filter(
    (card) =>
      card.relatedObjectIds.includes(object.id) ||
      object.relatedLayers.some((layerId) => card.relatedLayerIds.includes(layerId)),
  );
  const detailProfile = getCelestialDetailProfile(object);

  return (
    <aside className="right-panel surface-panel" aria-label="天体学习面板">
      <section className="object-hero">
        <div className="object-title-row">
          <span className="object-color" style={{ background: object.color }} />
          <div>
            <p className="object-type">{objectTypeLabel(object.type)}</p>
            <h2>{object.name}</h2>
          </div>
        </div>
        <span className={`realism-pill ${object.realism}`}>{realismLabel(object.realism)}</span>
        <p>{object.description}</p>
      </section>

      <section className="panel-section compact">
        <h3>关键事实</h3>
        <ul className="fact-list">
          {object.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </section>

      <section className="panel-section compact">
        <h3>物理画像</h3>
        <dl className="physical-profile">
          <div>
            <dt>类别</dt>
            <dd>{detailProfile.physical.classLabel}</dd>
          </div>
          <div>
            <dt>尺度</dt>
            <dd>{detailProfile.physical.scaleLabel}</dd>
          </div>
          <div>
            <dt>真实外观</dt>
            <dd>{detailProfile.physical.realAppearance}</dd>
          </div>
          <div>
            <dt>观测限制</dt>
            <dd>{detailProfile.physical.observationNote}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section compact">
        <h3>真实尺度</h3>
        <dl className="scale-profile">
          <div>
            <dt>尺度类型</dt>
            <dd>{scaleKindLabel(detailProfile.scaleProfile.scaleKind)}</dd>
          </div>
          <div>
            <dt>物理尺寸</dt>
            <dd>{formatScaleMeasurement(detailProfile.scaleProfile)}</dd>
          </div>
          <div>
            <dt>远景显示</dt>
            <dd>{formatGalaxyScaleRenderability(detailProfile.scaleProfile)}</dd>
          </div>
          <div>
            <dt>不确定性</dt>
            <dd>{detailProfile.scaleProfile.uncertaintyLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section compact">
        <h3>肉眼可见光学视图</h3>
        <div className="detail-profile">
          <strong>{detailProfile.label}</strong>
          <ul className="fact-list">
            {detailProfile.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <p>{detailProfile.opticalProfile.invisibleNote}</p>
          <p>{detailProfile.note}</p>
          <p>细节随角直径连续出现；远景标记不是实体大小。</p>
        </div>
      </section>

      <section className="panel-section compact">
        <h3>银河坐标</h3>
        <dl className="coordinate-grid">
          <div>
            <dt>X</dt>
            <dd>{object.galactic.xKly.toFixed(2)} kly</dd>
          </div>
          <div>
            <dt>Y</dt>
            <dd>{object.galactic.yKly.toFixed(2)} kly</dd>
          </div>
          <div>
            <dt>Z</dt>
            <dd>{object.galactic.zKly.toFixed(2)} kly</dd>
          </div>
        </dl>
      </section>

      <section className="panel-section compact">
        <h3>数据来源</h3>
        <div className="source-list">
          {object.sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          ))}
        </div>
      </section>

      <section className="panel-section compact">
        <h3>学习卡片</h3>
        <div className="learning-card-list">
          {relatedCards.map((card) => (
            <article key={card.id} className="learning-card">
              <h4>{card.title}</h4>
              <p>{card.summary}</p>
              <ul>
                {card.keyFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <a href={card.source.url} target="_blank" rel="noreferrer">
                {card.source.label}
              </a>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

function realismLabel(realism: CatalogObject['realism']) {
  if (realism === 'measured') return '实测';
  if (realism === 'model') return '模型';
  return '艺术近似';
}

function objectTypeLabel(type: CatalogObject['type']) {
  const labels: Record<CatalogObject['type'], string> = {
    star: '恒星',
    'black-hole': '黑洞',
    region: '区域',
    arm: '旋臂',
    nebula: '星云',
    cluster: '星团',
    marker: '标记',
    'globular-cluster': '球状星团',
    'galaxy-component': '银河结构',
  };
  return labels[type];
}
