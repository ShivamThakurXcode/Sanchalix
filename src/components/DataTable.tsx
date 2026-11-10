'use client';

import Button from '@cloudscape-design/components/button';
import Cards from '@cloudscape-design/components/cards';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table, { type TableProps } from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/EmptyState';
import type { IconKey } from '@/components/icons';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useIsMobile } from '@/lib/useIsMobile';

const PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DELAY_MS = 350;

export type Column<T> = {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  isRowHeader?: boolean;
  width?: number;
  minWidth?: number;
  sortBy?: (item: T) => string | number;
  defaultVisible?: boolean;
  card?: boolean;
  editConfig?: TableProps.ColumnDefinition<T>['editConfig'];
};

export type ServerPage = { page: number; nextCursor: string | null; prevCursor: string | null; pageSize?: number; q?: string };

type Stored = { pageSize?: number; wrapLines?: boolean; columns?: { id: string; visible: boolean }[] };

function readStored(key: string): Stored {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

function writeStored(key: string, value: Stored) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preferences are a convenience; a blocked store just means they are not remembered.
  }
}

export function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  return (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params}`);
  };
}

export function DataTable<T>({
  id,
  title,
  variant = 'h2',
  defaultPageSize = 25,
  description,
  counter,
  actions,
  above,
  items,
  columns,
  trackBy = 'id',
  search,
  searchPlaceholder,
  filters,
  filtered = false,
  onClearFilters,
  clearParams = [],
  empty,
  server,
  total,
  tableProps,
  cardTitle,
}: {
  id: string;
  title: string;
  variant?: 'h1' | 'h2';
  defaultPageSize?: number;
  description?: ReactNode;
  counter?: string;
  actions?: ReactNode;
  above?: ReactNode;
  items: T[] | null;
  columns: Column<T>[];
  trackBy?: string;
  search?: (item: T) => string;
  searchPlaceholder?: string;
  filters?: ReactNode;
  filtered?: boolean;
  onClearFilters?: () => void;
  clearParams?: string[];
  empty: { icon: IconKey; heading: string; body: string; action?: ReactNode } | null;
  server?: ServerPage;
  total?: number;
  tableProps?: Partial<TableProps<T>>;
  cardTitle?: (item: T) => ReactNode;
}) {
  const t = useTranslations('table');
  const setParams = useSetParams();
  const isMobile = useIsMobile();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const storeKey = `table:${id}`;
  const [stored, setStored] = useState<Stored>({});
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);
  const urlParams = useSearchParams();
  const urlSize = Number(urlParams.get('pageSize'));
  const serverSize = server?.pageSize ?? (PAGE_SIZES.includes(urlSize) ? urlSize : 25);
  const serverQuery = server?.q ?? urlParams.get('q') ?? '';
  const [text, setText] = useState(serverQuery);
  const sent = useRef(serverQuery);

  useEffect(() => {
    const saved = readStored(storeKey);
    setStored(saved);
    if (saved.pageSize && !server) setClientPageSize(saved.pageSize);
    if (saved.pageSize && server && saved.pageSize !== serverSize && !new URLSearchParams(window.location.search).has('pageSize')) {
      setParams({ pageSize: String(saved.pageSize), cursor: null });
    }
    // Runs once per table: it only restores what this user saved last time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  useEffect(() => {
    if (!server || text === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = text;
      setParams({ q: text || null, cursor: null });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const pageSize = server ? serverSize : clientPageSize;
  const needle = text.trim().toLowerCase();
  const collection = useCollection(server ? [] : (items ?? []), {
    filtering: { filteringFunction: (item) => !search || !needle || search(item).toLowerCase().includes(needle) },
    pagination: { pageSize },
    sorting: {},
  });
  useEffect(() => {
    if (!server) collection.actions.setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, pageSize]);

  const visible = server ? (items ?? []) : collection.items;
  const searching = Boolean(needle) || filtered;
  const clear = () => {
    setText('');
    onClearFilters?.();
    if (server) {
      sent.current = '';
      setParams({ q: null, cursor: null, ...Object.fromEntries(clearParams.map((key) => [key, null])) });
    }
  };

  const ordered = [
    ...(stored.columns ?? []).filter((saved) => columns.some((column) => column.id === saved.id)),
    ...columns.filter((column) => !stored.columns?.some((saved) => saved.id === column.id)).map((column) => ({ id: column.id, visible: column.defaultVisible !== false })),
  ];
  const wrapLines = stored.wrapLines ?? false;
  const save = (next: Stored) => {
    setStored(next);
    writeStored(storeKey, next);
  };

  const countText = counter ?? (server ? undefined : `(${collection.filteredItemsCount ?? 0})`);
  const filterControls = [
    (search || (server && searchPlaceholder)) && (
      <TextFilter
        key="search"
        filteringText={text}
        filteringPlaceholder={searchPlaceholder ?? t('searchPlaceholder')}
        filteringAriaLabel={searchPlaceholder ?? t('searchPlaceholder')}
        {...(!server && needle && { countText: t('matches', { count: collection.filteredItemsCount ?? 0 }) })}
        onChange={({ detail }) => setText(detail.filteringText)}
      />
    ),
    filters && <div key="filters">{filters}</div>,
  ].filter(Boolean);
  const filter =
    filterControls.length === 2 ? (
      <Grid gridDefinition={[{ colspan: { default: 12, xs: 4 } }, { colspan: { default: 12, xs: 8 } }]}>{filterControls}</Grid>
    ) : (
      (filterControls[0] ?? undefined)
    );

  const pagination = server ? (
    <Pagination
      currentPageIndex={server.page}
      pagesCount={server.nextCursor ? server.page + 1 : server.page}
      openEnd={Boolean(server.nextCursor)}
      disabled={!items}
      onChange={({ detail }) => {
        // Cursors only step one page at a time, so any earlier page other than the first steps back by one.
        const target = detail.currentPageIndex;
        setParams({ cursor: target === 1 ? null : target > server.page ? server.nextCursor : server.prevCursor });
      }}
    />
  ) : (
    <Pagination {...collection.paginationProps} disabled={!items} />
  );

  const preferences = (
    <CollectionPreferences
      preferences={{
        pageSize,
        wrapLines,
        contentDisplay: ordered,
      }}
      pageSizePreference={{ options: PAGE_SIZES.map((value) => ({ value, label: t('pageSize', { count: value }) })) }}
      {...(!isMobile && {
        wrapLinesPreference: {},
        contentDisplayPreference: {
          options: columns.map((column) => ({ id: column.id, label: column.header || column.id, ...(column.isRowHeader && { alwaysVisible: true }) })),
        },
      })}
      onConfirm={({ detail }) => {
        const next: Stored = {
          pageSize: detail.pageSize ?? pageSize,
          wrapLines: detail.wrapLines ?? wrapLines,
          columns: detail.contentDisplay ? [...detail.contentDisplay] : ordered,
        };
        save(next);
        if (server) setParams({ pageSize: String(next.pageSize), cursor: null });
        else setClientPageSize(next.pageSize ?? pageSize);
      }}
    />
  );

  const shared = {
    trackBy,
    items: visible,
    loading: !items,
    loadingText: t('loading'),
    header: (
      <SpaceBetween size="m">
        <Header variant={variant} counter={countText} description={description} actions={actions}>
          {title}
        </Header>
        {above}
      </SpaceBetween>
    ),
    filter,
    pagination,
    preferences,
    empty: searching ? (
      <EmptyState
        icon="search"
        heading={t('noMatches.heading')}
        body={t('noMatches.body')}
        action={<Button onClick={clear}>{t('noMatches.clear')}</Button>}
      />
    ) : (
      empty && <EmptyState {...empty} />
    ),
  };

  const rowHeader = columns.find((column) => column.isRowHeader) ?? columns[0];
  if (isMobile && rowHeader) {
    return (
      <Cards
        {...shared}
        variant="container"
        cardDefinition={{
          header: cardTitle ?? rowHeader.cell,
          sections: columns
            .filter((column) => column !== rowHeader && column.header && column.card !== false)
            .map((column) => ({ id: column.id, header: column.header, content: column.cell })),
        }}
      />
    );
  }

  // Table's sticky scrollbar offset is measured in the browser, so server HTML never matches it.
  if (!hydrated) return null;

  return (
    <Table
      {...collection.collectionProps}
      {...shared}
      variant="container"
      stickyHeader
      resizableColumns
      enableKeyboardNavigation
      wrapLines={wrapLines}
      columnDisplay={ordered}
      renderAriaLive={({ firstIndex, lastIndex }) => t('range', { first: firstIndex, last: lastIndex })}
      {...tableProps}
      columnDefinitions={columns.map(({ id: columnId, header, cell, isRowHeader, width, minWidth, sortBy, editConfig }) => ({
        id: columnId,
        header,
        cell,
        ...(isRowHeader && { isRowHeader }),
        ...(width && { width }),
        ...(minWidth && { minWidth }),
        ...(editConfig && { editConfig }),
        ...(sortBy && !server && { sortingComparator: (a: T, b: T) => (sortBy(a) < sortBy(b) ? -1 : sortBy(a) > sortBy(b) ? 1 : 0) }),
      }))}
    />
  );
}
