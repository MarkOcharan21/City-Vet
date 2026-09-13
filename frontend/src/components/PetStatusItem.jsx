import StatusBadge from './StatusBadge';

export default function PetStatusItem({ category, status, description }) {
  return (
    <div className="pet-status-item">
      <div className="pet-status-item-header">
        <span className="pet-status-item-label">{category}</span>
        <StatusBadge status={status} />
      </div>
      <p className="pet-status-item-description">{description}</p>
    </div>
  );
}
