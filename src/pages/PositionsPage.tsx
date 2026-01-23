import { PositionList } from '../components/PositionList';
import { useOpenPositions } from '../hooks/usePositions';
import { useCandidates } from '../hooks/useCandidates';

export function PositionsPage() {
  const { positions, loading: positionsLoading } = useOpenPositions();
  const { candidates, loading: candidatesLoading } = useCandidates();

  if (positionsLoading || candidatesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Open Positions</h1>
      <PositionList positions={positions} candidates={candidates} />
    </div>
  );
}
