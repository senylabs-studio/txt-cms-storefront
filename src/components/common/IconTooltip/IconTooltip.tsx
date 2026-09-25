import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

interface IconTooltipProps {
  /** Shown on hover/focus. No label → renders the child as-is. */
  label?: string;
  /** The child is disabled: disabled buttons fire no mouse events, so hover needs a wrapper. */
  disabled?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

// Every button that is only an icon gets its meaning as a tooltip (in the app's language) — an
// icon on its own doesn't tell a new user what it does. Pair with aria-label on the button itself
// for screen readers.
const IconTooltip: React.FC<IconTooltipProps> = ({ label, disabled, placement = 'top', children }) => {
  if (!label) return children;
  return (
    <OverlayTrigger placement={placement} delay={{ show: 250, hide: 0 }} overlay={<Tooltip>{label}</Tooltip>}>
      {disabled ? <span className="d-inline-block" tabIndex={0}>{children}</span> : children}
    </OverlayTrigger>
  );
};

export default IconTooltip;
