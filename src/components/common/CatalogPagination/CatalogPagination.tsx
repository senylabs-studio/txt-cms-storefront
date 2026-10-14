import React from 'react';
import { Pagination } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { pageWindow } from '../../../utils/pageWindow';

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/**
 * Page links are real `<a href="?pagina=N">` (keeping the rest of the query), so search engines
 * can follow them to the products past page 1 (audit 2026-10-14: they were buttons). A click is
 * still handled in place, without a reload.
 */
const CatalogPagination: React.FC<Props> = ({ currentPage, totalPages, onChange }) => {
  const { pathname, search } = useLocation();
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams(search);
    if (page > 1) params.set('pagina', String(page)); else params.delete('pagina');
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const go = (page: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(page);
  };

  return (
    <div className="d-flex justify-content-center mt-4">
      <Pagination>
        <Pagination.Prev disabled={currentPage === 1} href={hrefFor(currentPage - 1)} onClick={go(currentPage - 1)} />
        {pageWindow(currentPage, totalPages).map((p, i) => p === 'gap'
          ? <Pagination.Ellipsis className="page-gap" key={`gap-${i}`} disabled />
          : (
            <Pagination.Item key={p} active={p === currentPage} href={hrefFor(p)} onClick={go(p)}>
              {p}
            </Pagination.Item>
          ))}
        <Pagination.Next disabled={currentPage === totalPages} href={hrefFor(currentPage + 1)} onClick={go(currentPage + 1)} />
      </Pagination>
    </div>
  );
};

export default CatalogPagination;
