import React from 'react';
import { Pagination } from 'react-bootstrap';
import { pageWindow } from '../../../utils/pageWindow';

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const CatalogPagination: React.FC<Props> = ({ currentPage, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="d-flex justify-content-center mt-4">
      <Pagination>
        <Pagination.Prev disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)} />
        {pageWindow(currentPage, totalPages).map((p, i) => p === 'gap'
          ? <Pagination.Ellipsis key={`gap-${i}`} disabled />
          : (
            <Pagination.Item key={p} active={p === currentPage} onClick={() => onChange(p)}>
              {p}
            </Pagination.Item>
          ))}
        <Pagination.Next disabled={currentPage === totalPages} onClick={() => onChange(currentPage + 1)} />
      </Pagination>
    </div>
  );
};

export default CatalogPagination;
