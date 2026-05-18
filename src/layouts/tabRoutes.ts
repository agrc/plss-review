type TabRoute = {
  id: string;
  path: string;
  label: string;
};

export const formatReceivedTabLabel = (count?: number) =>
  count === undefined ? 'Received' : `Received (${count})`;

export const getTabRoutes = (receivedCount?: number): TabRoute[] => [
  { id: 'received', path: '/secure/received', label: formatReceivedTabLabel(receivedCount) },
  { id: 'county', path: '/secure/county', label: 'Under County Review' },
  { id: 'approved', path: '/secure/approved', label: 'County Approved' },
  { id: 'rejected', path: '/secure/rejected', label: 'Rejected' },
];
