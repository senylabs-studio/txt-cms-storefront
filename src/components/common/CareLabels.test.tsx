import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByLabelText('careLabels.wash30. careLabels.help.wash30')).toBeInTheDocument();
    expect(screen.queryByLabelText('careLabels.noBleach. careLabels.help.noBleach')).not.toBeInTheDocument();
  });

  it('renders one icon per set bit, in CARE_LABEL_DEFS order', () => {
    render(<CareLabels careLabels={1 + 4} />); // wash30 (bit 1) + noDryer (bit 4)
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByLabelText('careLabels.wash30. careLabels.help.wash30')).toBeInTheDocument();
    expect(screen.getByLabelText('careLabels.noDryer. careLabels.help.noDryer')).toBeInTheDocument();
    expect(screen.queryByLabelText('careLabels.noBleach. careLabels.help.noBleach')).not.toBeInTheDocument();
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

  it('explains the symbol in a tooltip on focus (tap on mobile)', async () => {
    render(<CareLabels careLabels={32} />);
    fireEvent.focus(screen.getByRole('img'));
    expect(await screen.findByText('careLabels.help.oekoTex')).toBeInTheDocument();
  });
});
