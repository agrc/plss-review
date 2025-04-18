import { Fragment } from 'react';
import ContentLoader, { type IContentLoaderProps } from 'react-content-loader';

const position = (index: number) => 40 * index + 13;

export const TableLoader = (props: IContentLoaderProps) => {
  return (
    <div className="w-full p-2">
      <table className="w-full">
        <thead>
          <tr>
            <th className="pointer-events-none w-[373px] text-left text-xl font-bold">BLM Point Id</th>
            <th className="pointer-events-none w-[133px] text-left text-xl font-bold">County</th>
            <th className="pointer-events-none text-left text-xl font-bold">Submitter</th>
            <th className="pointer-events-none text-left text-xl font-bold">Submission Date</th>
            <th className="pointer-events-none text-left text-xl font-bold">MRRC</th>
          </tr>
        </thead>
      </table>
      <ContentLoader width={1000} height={550} viewBox="0 0 1000 550" {...props}>
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Fragment key={i}>
              <rect x="5" y={position(i)} rx="3" ry="3" width="200" height="20" />
              <rect x="380" y={position(i)} rx="3" ry="3" width="75" height="20" />
              <rect x="520" y={position(i)} rx="3" ry="3" width="100" height="20" />
              <rect x="674" y={position(i)} rx="3" ry="3" width="100" height="20" />
              <rect x="930" y={position(i)} rx="3" ry="3" width="30" height="20" />
            </Fragment>
          ))}
      </ContentLoader>
    </div>
  );
};

export const ImageLoader = (props: IContentLoaderProps) => {
  return (
    <ContentLoader
      viewBox="0 0 500 500"
      height={200}
      width={200}
      backgroundColor="#f3f3f3"
      foregroundColor="#ecebeb"
      {...props}
    >
      <path d="M484.52,64.61H15.65C7.1,64.61.17,71.2.17,79.31V299.82c0,8.12,6.93,14.7,15.48,14.7H484.52c8.55,0,15.48-6.58,15.48-14.7V79.31C500,71.2,493.07,64.61,484.52,64.61Zm-9,204.34c0,11.84-7.14,21.44-15.94,21.44H436.39L359.16,171.52c-7.1-10.92-19.67-11.16-27-.51L258.64,277.94C253.78,285,245.73,286,240,280.2l-79.75-80.62c-6-6.06-14.33-5.7-20,.88L62.34,290.39H40.63c-8.8,0-15.94-9.6-15.94-21.44V110.19c0-11.84,7.14-21.44,15.94-21.44H459.54c8.8,0,15.94,9.6,15.94,21.44Z" />
      <ellipse cx="120" cy="140" rx="28" ry="28" />
    </ContentLoader>
  );
};
