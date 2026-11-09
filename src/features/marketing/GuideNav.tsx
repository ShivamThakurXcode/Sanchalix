'use client';

import ExpandableSection from '@cloudscape-design/components/expandable-section';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import { useEffect, useState } from 'react';

export type GuideGroup = { title: string; items: { id: string; text: string }[] };

export function GuideNav({ label, groups }: { label: string; groups: GuideGroup[] }) {
  const [active, setActive] = useState(`#${groups[0]?.items[0]?.id}`);

  useEffect(() => {
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) visible.add(target.id);
          else visible.delete(target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(`#${first}`);
      },
      { rootMargin: '-72px 0px -60% 0px' },
    );
    for (const id of ids) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [groups]);

  const navigation = (
    <SideNavigation
      activeHref={active}
      items={groups.map(({ title, items }) => ({
        type: 'section-group' as const,
        title,
        items: items.map(({ id, text }) => ({ type: 'link' as const, text, href: `#${id}` })),
      }))}
    />
  );

  return (
    <>
      <div className="vw-guide-nav-wide">{navigation}</div>
      <div className="vw-guide-nav-narrow">
        <ExpandableSection variant="container" headerText={label}>
          {navigation}
        </ExpandableSection>
      </div>
    </>
  );
}
