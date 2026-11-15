import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useCounts } from '../hooks/useEmails';
import { Sidebar } from './Sidebar';
import { Search } from './ui/Icons';

export interface LayoutContext {
  query: string;
}

export function AppLayout() {
  const { counts } = useCounts();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300); // debounce Elasticsearch calls
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="min-h-screen bg-white lg:flex">
      <Sidebar counts={counts} />
      <div className="min-w-0 flex-1">
        <div className="border-b border-line px-4 py-3 sm:px-6">
          <label className="flex max-w-xl items-center gap-2 rounded-lg bg-paper px-3 py-2 text-muted focus-within:ring-2 focus-within:ring-accent">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, subject or body"
              aria-label="Search emails"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <Outlet context={{ query } satisfies LayoutContext} />
      </div>
    </div>
  );
}
