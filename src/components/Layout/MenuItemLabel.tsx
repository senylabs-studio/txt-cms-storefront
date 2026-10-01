import React from 'react';
import { FaGift, FaPercent } from 'react-icons/fa';

const ICONS: Record<string, React.ReactNode> = {
  Offers: <FaPercent aria-hidden="true" className="menu-item-icon" />,
  GiftCards: <FaGift aria-hidden="true" className="menu-item-icon" />,
};

/** A menu entry's name, with its icon in front for the special pages (Ofertas, Tarjeta regalo). */
const MenuItemLabel: React.FC<{ item: { type: string; name: string } }> = ({ item }) => (
  <>{ICONS[item.type]}{item.name}</>
);

export default MenuItemLabel;
