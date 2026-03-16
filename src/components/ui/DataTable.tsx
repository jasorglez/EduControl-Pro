/**
 * DataTable — Componente estándar de tabla reutilizable
 * Estilo: Excel (líneas divisoras) + ordenamiento tipo AG Grid
 * Basado en TanStack Table v8
 */
import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Row,
} from '@tanstack/react-table';
import { motion } from 'motion/react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DataTableProps<T> {
  /** Filas de datos */
  data: T[];
  /** Definición de columnas TanStack */
  columns: ColumnDef<T, any>[];
  /** Muestra spinner en lugar de filas */
  isLoading?: boolean;
  /** Texto del estado vacío */
  emptyMessage?: string;
  /** Filas por página (default 15) */
  defaultPageSize?: number;
  /** Filtro global controlado desde afuera */
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  /** Selección de fila */
  selectedRowId?: string | null;
  onRowClick?: (row: T) => void;
  /** Función para obtener id único de cada fila */
  getRowId?: (row: T) => string;
  /** Mensaje cuando hay acción de limpiar filtros */
  onClearFilters?: () => void;
  /** Sub-fila expandible: si retorna un nodo, se renderiza debajo de la fila */
  renderSubRow?: (row: T) => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No hay registros disponibles',
  defaultPageSize = 15,
  globalFilter = '',
  onGlobalFilterChange,
  selectedRowId,
  onRowClick,
  getRowId,
  onClearFilters,
  renderSubRow,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable<T>({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId ?? ((_row, index) => String(index)),
    initialState: { pagination: { pageSize: defaultPageSize } },
  });

  const totalFiltered = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageFrom = pageIndex * pageSize + 1;
  const pageTo   = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">

          {/* ── Header (AG Grid style) ───────────────────────────────────── */}
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, colIdx) => {
                  const canSort  = header.column.getCanSort();
                  const sortDir  = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={[
                        // Base
                        'relative px-4 py-3 text-left font-bold text-xs uppercase tracking-wider select-none whitespace-nowrap',
                        // AG Grid header look
                        'bg-gray-100 text-gray-500',
                        // Vertical divider — left border on all except first column
                        colIdx > 0 ? 'border-l border-gray-300' : '',
                        // Bottom border
                        'border-b-2 border-gray-300',
                        // Sortable cursor
                        canSort ? 'cursor-pointer hover:bg-gray-200 transition-colors' : '',
                      ].join(' ')}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())
                        }
                        {/* Sort indicator */}
                        {canSort && (
                          <span className="ml-auto shrink-0">
                            {sortDir === 'asc'  ? <ArrowUp   className="w-3.5 h-3.5 text-indigo-500" /> :
                             sortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-indigo-500" /> :
                             <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />}
                          </span>
                        )}
                      </div>

                      {/* AG Grid resize handle visual */}
                      {colIdx < headerGroup.headers.length - 1 && (
                        <span className="absolute right-0 top-1/4 h-1/2 w-px bg-gray-300" />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center border-b border-gray-200">
                  <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-xs font-medium">Cargando registros...</p>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center border-b border-gray-200">
                  <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">{emptyMessage}</p>
                  {onClearFilters && globalFilter && (
                    <button
                      onClick={onClearFilters}
                      className="mt-3 text-indigo-500 text-xs font-bold hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: Row<T>, rowIdx) => {
                const rowId      = table.options.getRowId!(row.original, rowIdx, row);
                const isSelected = selectedRowId != null && rowId === selectedRowId;
                const isEven     = rowIdx % 2 === 1;
                const subContent = renderSubRow?.(row.original);

                return (
                  <React.Fragment key={row.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(rowIdx * 0.012, 0.15) }}
                      onClick={() => onRowClick?.(row.original)}
                      className={[
                        'border-b border-gray-200 transition-colors',
                        onRowClick ? 'cursor-pointer' : '',
                        isSelected
                          ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500'
                          : isEven
                            ? 'bg-gray-50/50 hover:bg-indigo-50/40'
                            : 'bg-white hover:bg-indigo-50/40',
                      ].join(' ')}
                    >
                      {row.getVisibleCells().map((cell, colIdx) => (
                        <td
                          key={cell.id}
                          className={[
                            'px-4 py-2.5 text-sm text-gray-700',
                            colIdx > 0 ? 'border-l border-gray-200' : '',
                          ].join(' ')}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                    {subContent && (
                      <tr>
                        <td colSpan={columns.length} className="p-0 border-b border-gray-200">
                          {subContent}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {!isLoading && table.getPageCount() > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50/60 shrink-0">

          {/* Info */}
          <p className="text-xs text-gray-400 font-medium whitespace-nowrap">
            {totalFiltered === 0
              ? 'Sin resultados'
              : <>Mostrando <span className="text-gray-700 font-bold">{pageFrom}–{pageTo}</span> de <span className="text-gray-700 font-bold">{totalFiltered}</span> registros</>
            }
          </p>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => table.setPageIndex(0)}    disabled={!table.getCanPreviousPage()} title="Primera página">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </NavBtn>
            <NavBtn onClick={() => table.previousPage()}     disabled={!table.getCanPreviousPage()} title="Página anterior">
              <ChevronLeft className="w-3.5 h-3.5" />
            </NavBtn>

            {/* Page numbers */}
            {buildPageRange(pageIndex, table.getPageCount()).map((p, i) =>
              p === '...' ? (
                <span key={`sep-${i}`} className="w-7 text-center text-gray-400 text-xs">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p as number)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    pageIndex === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {(p as number) + 1}
                </button>
              )
            )}

            <NavBtn onClick={() => table.nextPage()}                          disabled={!table.getCanNextPage()} title="Página siguiente">
              <ChevronRight className="w-3.5 h-3.5" />
            </NavBtn>
            <NavBtn onClick={() => table.setPageIndex(table.getPageCount()-1)} disabled={!table.getCanNextPage()} title="Última página">
              <ChevronsRight className="w-3.5 h-3.5" />
            </NavBtn>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <select
              value={pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              {[10, 15, 25, 50, 100].map(s => (
                <option key={s} value={s}>{s} / pág</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NavBtn({
  onClick, disabled, title, children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/** Genera el rango de páginas con ellipsis: [0,1,2,'...',8] */
function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages: (number | '...')[] = [0];

  if (current > 2)  pages.push('...');
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 3) pages.push('...');

  pages.push(total - 1);
  return pages;
}
