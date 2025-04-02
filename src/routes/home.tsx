import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';

export function meta() {
  return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }];
}

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
    mrrc: true,
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
    cell: (info: { getValue: () => boolean }) => (info.getValue() ? 'Yes' : 'No'),
  }),
];

export default function Home() {
  const [data] = useState(() => [...defaultData]);

  const table = useReactTable({
    data, //also good to use a fallback array that is defined outside of the component (stable reference)
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-2">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
