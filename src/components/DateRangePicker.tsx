import { parseDate } from '@internationalized/date';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  DateRangePicker as AriaDateRangePicker,
  Button,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  RangeCalendar,
  type DateValue,
  type RangeValue,
} from 'react-aria-components';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

export function DateRangePicker({ label, value, onChange, compact = false }: Props) {
  const [startStr, endStr] = value.split('|');
  const parsedValue =
    startStr && endStr
      ? ({ start: parseDate(startStr), end: parseDate(endStr) } as unknown as RangeValue<DateValue>)
      : null;

  return (
    <AriaDateRangePicker
      aria-label={label}
      value={parsedValue}
      onChange={(nextRange) => {
        if (!nextRange) {
          onChange('');
          return;
        }

        onChange(`${nextRange.start.toString()}|${nextRange.end.toString()}`);
      }}
      className="w-full"
    >
      <Group
        className={`flex h-9 w-full items-center rounded border border-gray-300 bg-white px-2 text-sm text-gray-800 focus-within:border-blue-500 dark:bg-gray-700 dark:text-white ${compact ? 'overflow-hidden' : ''}`}
      >
        <DateInput slot="start" className={compact ? 'flex min-w-0 shrink' : 'flex'}>
          {(segment) => (
            <DateSegment
              segment={segment}
              className={`rounded px-0.5 data-[placeholder]:text-gray-500 focus:bg-blue-100 focus:outline-none dark:data-[placeholder]:text-gray-400 dark:focus:bg-blue-900 ${compact ? 'max-w-full overflow-hidden text-ellipsis whitespace-nowrap' : ''}`}
            />
          )}
        </DateInput>
        <span aria-hidden className={`px-1 text-gray-500 dark:text-gray-400 ${compact ? 'shrink-0' : ''}`}>
          -
        </span>
        <DateInput slot="end" className={compact ? 'flex min-w-0 shrink' : 'flex'}>
          {(segment) => (
            <DateSegment
              segment={segment}
              className={`rounded px-0.5 data-[placeholder]:text-gray-500 focus:bg-blue-100 focus:outline-none dark:data-[placeholder]:text-gray-400 dark:focus:bg-blue-900 ${compact ? 'max-w-full overflow-hidden text-ellipsis whitespace-nowrap' : ''}`}
            />
          )}
        </DateInput>
        <Button
          className={`ml-auto rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 ${compact ? 'shrink-0' : ''}`}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </Group>
      <Popover className="z-50 rounded border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-700">
        <Dialog>
          <RangeCalendar>
            <header className="mb-2 flex items-center justify-between gap-2">
              <Button
                slot="previous"
                className="rounded p-1 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Heading className="text-sm font-semibold text-gray-800 dark:text-gray-100" />
              <Button
                slot="next"
                className="rounded p-1 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </header>
            <CalendarGrid className="w-full border-collapse">
              {(date) => (
                <CalendarCell
                  date={date}
                  className="m-0.5 h-8 w-8 rounded text-center text-sm text-gray-700 data-[selection-end]:rounded-r data-[selection-start]:rounded-l data-[selected]:bg-blue-600 data-[selected]:text-white data-[unavailable]:text-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:data-[unavailable]:text-gray-500 dark:hover:bg-gray-600"
                />
              )}
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
