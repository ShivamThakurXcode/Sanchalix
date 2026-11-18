"use client";

import { type ReactNode, useState } from "react";

/** The header: the school's name and apply button, then the menu bar. On a phone the bar opens from a Menu button. */
export function SiteNav({
  brand,
  actions,
  label,
  menu,
  children,
}: {
  brand: ReactNode;
  actions: ReactNode;
  label: string;
  menu: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="vw-site-headwrap" data-open={open}>
      <div className="vw-site-header">
        {brand}
        <div className="vw-site-head-actions">
          {actions}
          <button
            type="button"
            className="vw-site-menu"
            aria-expanded={open}
            aria-controls="site-links"
            onClick={() => setOpen((value) => !value)}
          >
            {menu}
          </button>
        </div>
      </div>
      <nav className="vw-site-navbar" id="site-links" aria-label={label}>
        <div className="vw-site-wrap">{children}</div>
      </nav>
    </div>
  );
}
