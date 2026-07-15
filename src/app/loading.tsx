export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-[#5b3db8] rounded-full animate-spin"></div>
      <h2 className="mt-4 text-lg font-medium text-slate-700 tracking-wide">Loading...</h2>
    </div>
  );
}
