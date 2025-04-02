import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { useNavigate } from 'react-router';

type Submission = {
  blmPointId: string;
  county: string;
  submitter: string;
  date: string;
  mrrc: boolean;
};

const defaultData: Submission[] = [
  {
    blmPointId: 'UT260030N0030E0_600100',
    county: 'Salt Lake',
    submitter: 'Mike Smith',
    date: '2025-01-02',
    mrrc: true,
  },
  {
    blmPointId: 'UT260290S0070E0-540100',
    county: 'Salt Lake',
    submitter: 'Sara Jones',
    date: '2025-03-01',
    mrrc: false,
  },
];

const columnHelper = createColumnHelper<Submission>();
const columns = [
  columnHelper.accessor('blmPointId', {
    id: 'blmPointId',
    header: () => 'BLM Point Id',
  }),
  columnHelper.accessor('county', {
    id: 'county',
    header: () => 'County',
  }),
  columnHelper.accessor('submitter', {
    id: 'submitter',
    header: () => 'Submitter',
  }),
  columnHelper.accessor('date', {
    id: 'date',
    header: () => 'Submission Date',
  }),
  columnHelper.accessor('mrrc', {
    id: 'mrrc',
    header: () => 'MRRC',
    cell: (info) => (info.getValue() ? 'Yes' : 'No'),
  }),
];

export default function Dashboard() {
  const [data] = useState(() => [...defaultData]);
  const navigate = useNavigate();

  const table = useReactTable({
    data, //also good to use a fallback array that is defined outside of the component (stable reference)
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full p-2">
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
              onClick={() => navigate(`/submissions/${row.original.blmPointId}`)}
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
    </div>
  );
}
