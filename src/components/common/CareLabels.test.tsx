import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CareLabels from './CareLabels';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CareLabels', () => {
  it('renders nothing when no care-label bits are set', () => {
    const { container } = render(<CareLabels careLabels={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the icon for a single set bit', () => {
    render(<CareLabels careLabels={1} />); // wash30 only
    expect(screen.getByTitle('careLabels.wash30')).toBeInTheDocument();
    expect(screen.queryByTitle('careLabels.noBleach')).not.toBeInTheDocument();
  });

  it('renders one icon per set bit, in CARE_LABEL_DEFS order', () => {
    render(<CareLabels careLabels={1 + 4} />); // wash30 (bit 1) + noDryer (bit 4)
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByTitle('careLabels.wash30')).toBeInTheDocument();
    expect(screen.getByTitle('careLabels.noDryer')).toBeInTheDocument();
    expect(screen.queryByTitle('careLabels.noBleach')).not.toBeInTheDocument();
  });

  it('renders all six icons when every known bit is set', () => {
    const allBits = 1 + 2 + 4 + 8 + 16 + 32;
    render(<CareLabels careLabels={allBits} />);
    expect(screen.getAllByRole('img')).toHaveLength(6);
  });

  it('ignores bits that do not correspond to a known care label', () => {
    render(<CareLabels careLabels={1 + 64} />); // 64 isn't in CARE_LABEL_DEFS
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });
});
