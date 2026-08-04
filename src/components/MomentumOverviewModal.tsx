import { MomentumCard } from './MomentumCard';

export function MomentumOverviewModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="social-modal momentum-overview" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
      <h2>Твой Momentum</h2>
      <p>Энергия для общения с AI-наставником.</p>
      <MomentumCard />
    </section>
  </div>;
}
