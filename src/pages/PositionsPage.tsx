import { PositionList } from '../components/PositionList';
import { useOpenPositions } from '../hooks/usePositions';
import { useCandidates } from '../hooks/useCandidates';

export function PositionsPage() {
  const positions = useOpenPositions();
  const candidates = useCandidates();

  return (
    <div>
      <h1>Open Positions</h1>
      <PositionList positions={positions} candidates={candidates} />
    </div>
  );
}
