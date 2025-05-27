export const ObjectPreview = ({ url }: { url: string }) => {
  return (
    <div className="size-full overflow-hidden rounded-lg border border-slate-400 shadow-sm">
      {url.search(/\.pdf\?/i) > -1 ? (
        <iframe className="size-full" src={url} title="PDF preview" allow="fullscreen">
          PDF preview
        </iframe>
      ) : (
        <img src={url} alt="upload preview" className="m-2 max-w-[300px] self-center rounded-t" />
      )}
    </div>
  );
};
