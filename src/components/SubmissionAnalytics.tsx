import { useQuery } from '@tanstack/react-query';
import { Disclosure, DisclosureHeader, DisclosurePanel, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { doc, Firestore, getDoc } from 'firebase/firestore';
import { getFiscalYear } from '../utils';

const fiscalYear = getFiscalYear(new Date());

const getStatsFrom = async (firestore: Firestore) => {
  const statsRef = doc(firestore, 'stats', `mrrc-${fiscalYear}`);
  const statsSnap = await getDoc(statsRef);

  if (!statsSnap.exists()) {
    return [];
  } else {
    const statsData = statsSnap.data();

    const totalCount = Object.values(statsData).reduce((sum, count) => sum + (count as number), 0);

    const formattedStats = Object.entries(statsData)
      .filter(([, count]) => count !== 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([county, count]) => {
        const titleCasedCounty = county.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
          return str.toUpperCase();
        });

        return `${titleCasedCounty}: ${count}`;
      });

    return [`Total: ${totalCount}`, ...formattedStats];
  }
};

const SubmissionAnalytics: React.FC = () => {
  const { firestore } = useFirestore();
  const { data, status } = useQuery({
    queryKey: ['firestore', 'submissions', firestore],
    queryFn: () => getStatsFrom(firestore),
  });

  return (
    <Disclosure className="mb-4">
      <DisclosureHeader>Submission counts by county (FY{fiscalYear})</DisclosureHeader>
      <DisclosurePanel className="data-open:p-2">
        {status === 'pending' && (
          <div className="size-4">
            <Spinner />
          </div>
        )}
        {status !== 'pending' && !data && (
          <div>
            <p className="text-pretty text-xs">No MRRC submissions have been tracked yet</p>
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 rounded">
          {status !== 'pending' &&
            data &&
            data.map((stat) => (
              <div key={stat} className="text-pretty text-xs">
                <p className="whitespace-nowrap font-thin">{stat}</p>
              </div>
            ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
};

export default SubmissionAnalytics;
