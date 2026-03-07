import { Info } from 'lucide-react';

export default function InfoTip({ text }) {
  return (
    <span className="relative group inline-flex items-center ml-1">
      <Info size={11} className="text-gray-300 group-hover:text-blue-400 cursor-help transition-colors" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
      </span>
    </span>
  );
}
