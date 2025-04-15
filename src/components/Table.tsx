import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type Row } from '@tanstack/react-table';
import type { Submission } from './shared/types';

const empty = [] as Submission[];
export default function Table({
  data,
  columns,
  onClick,
}: {
  data?: Submission[];
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  columns: ColumnDef<Submission, any>[];
  onClick: (row: Row<Submission>) => void;
}) {
  const table = useReactTable({
    data: data ?? empty, //also good to use a fallback array that is defined outside of the component (stable reference)
    columns,
    state: {
      columnVisibility: {
        id: false,
      },
    },
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">No new submissions. Go play in the sandbox!</div>
    );
  }
  return (
    <table className="w-full">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="pointer-events-none text-left text-xl font-bold">
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
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
