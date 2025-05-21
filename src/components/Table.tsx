import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { ChevronDownIcon } from 'lucide-react';
import { twJoin } from 'tailwind-merge';
import type { Submission } from './shared/types';

const empty = [] as Submission[];
export default function Table({
  data,
  columns,
  onClick,
  emptyMessage,
}: {
  data?: Submission[];
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  columns: ColumnDef<Submission, any>[];
  onClick: (row: Row<Submission>) => void;
  emptyMessage: string;
}) {
  const { getHeaderGroups, getRowModel } = useReactTable({
    debugTable: true,
    columns,
    data: data ?? empty, //also good to use a fallback array that is defined outside of the component (stable reference)
    state: {
      columnVisibility: {
        id: false,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!data || data.length === 0) {
    return <h3 className="mt-5 flex h-full w-full items-center justify-center">{emptyMessage}</h3>;
  }
  return (
    <table className="w-full">
      <thead>
        {getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="relative select-none p-2 text-left text-xl font-bold"
                style={{ width: `${header.getSize()}px` }}
              >
                {header.isPlaceholder ? null : (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                  <div
                    className={twJoin(
                      header.column.getCanSort() && 'flex cursor-pointer select-none items-center justify-between',
                      header.column.getIsSorted() &&
                        'before:absolute before:-bottom-1 before:left-0 before:z-10 before:block before:h-2 before:w-full before:rounded-full before:bg-secondary-500 before:transition-all before:duration-300',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: <ChevronDownIcon className="h-4 scale-x-[-1] scale-y-[-1] transition-transform" />,
                      desc: <ChevronDownIcon className="h-4 transition-transform" />,
                    }[header.column.getIsSorted().toString()] ?? null}
                  </div>
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer odd:bg-white even:bg-gray-100 active:bg-gray-300 hover:bg-gray-200 dark:odd:bg-zinc-800 dark:even:bg-zinc-700 dark:active:bg-red-500 dark:odd:hover:bg-secondary-900/70 dark:even:hover:bg-secondary-800/70"
            onClick={() => onClick(row)}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="border-b border-gray-200 p-2 dark:border-gray-600">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
