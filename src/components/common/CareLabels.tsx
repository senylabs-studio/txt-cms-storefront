import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import iconWash     from '../../assets/careIcons/wash-temperature.webp';
import iconNoBleach from '../../assets/careIcons/no-bleach.webp';
import iconNoDryer  from '../../assets/careIcons/no-dryer.webp';
import iconDryClean from '../../assets/careIcons/percloroetileno.png';
import iconIron     from '../../assets/careIcons/iron-temperature.webp';
import oekoTex     from '../../assets/careIcons/oeko-tex.png';

// eslint-disable-next-line react-refresh/only-export-components -- the label definitions live next to the component that renders them; dev-only HMR nicety
export const CARE_LABEL_DEFS = [
  { bit: 1,  key: 'wash30',    tKey: 'careLabels.wash30',    icon: iconWash },
  { bit: 2,  key: 'noBleach',  tKey: 'careLabels.noBleach',  icon: iconNoBleach },
  { bit: 4,  key: 'noDryer',   tKey: 'careLabels.noDryer',   icon: iconNoDryer },
  { bit: 8,  key: 'dryCleanP', tKey: 'careLabels.dryCleanP', icon: iconDryClean },
  { bit: 16, key: 'iron110',   tKey: 'careLabels.iron110',   icon: iconIron },
  { bit: 32, key: 'oekoTex',   tKey: 'careLabels.oekoTex',   icon: oekoTex },
] as const;

interface Props {
  careLabels: number;
}

const CareLabels: React.FC<Props> = ({ careLabels }) => {
  const { t } = useTranslation();
  const active = CARE_LABEL_DEFS.filter(d => !!(careLabels & d.bit));
  if (active.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {active.map(({ key, tKey, icon }) => (
        // A symbol alone doesn't tell most shoppers what it means: hover (or tap, on mobile —
        // it's focusable) shows its name and a one-line explanation.
        <OverlayTrigger
          key={key}
          placement="top"
          trigger={['hover', 'focus']}
          delay={{ show: 150, hide: 0 }}
          overlay={
            <Tooltip id={`care-${key}`}>
              <strong className="d-block">{t(tKey)}</strong>
              {t(`careLabels.help.${key}`)}
            </Tooltip>
          }
        >
          <div
            tabIndex={0}
            role="img"
            aria-label={`${t(tKey)}. ${t(`careLabels.help.${key}`)}`}
            style={{
              width: 48, height: 48,
              padding: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              cursor: 'help',
            }}
          >
            <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </OverlayTrigger>
      ))}
    </div>
  );
};

export default CareLabels;
