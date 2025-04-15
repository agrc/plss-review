export const ObjectPreview = ({ url }: { url: string }) => {
  return (
    <div className="size-full overflow-hidden rounded-lg border border-slate-400 shadow-sm">
      {url.search(/\.pdf\?/i) > -1 ? (
        <object className="size-full" data={url} type="application/pdf">
          PDF preview
        </object>
      ) : (
        <img src={url} alt="upload preview" className="m-2 max-w-[300px] self-center rounded-t" />
      )}
    </div>
  );
};
