import React from 'react';
import { UserX } from 'lucide-react';
import { RejectionReasonItem } from '@/types/posdashboard';

interface RejectionAnalysisProps {
  reasons: RejectionReasonItem[];
  totalRejections: number;
}

export const RejectionAnalysis: React.FC<RejectionAnalysisProps> = ({
  reasons,
  totalRejections,
}) => {
  return (
    <section className="mb-10">
      <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-zen-stone/60 gap-2">
          <div>
            <h3 className="text-sm font-bold text-zen-charcoal flex items-center gap-2">
              <UserX className="w-4 h-4 text-amber-600" />
              <span>Walk-in Rejection & Demand Bottleneck Analysis</span>
            </h3>
            <p className="text-[11px] text-zen-muted">
              Capacity bottlenecks, unavailable therapists, and lost walk-in guest opportunities
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {totalRejections} Total Walk-in Rejections
            </span>
          </div>
        </div>

        {reasons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {reasons.map((item) => (
              <div
                key={item.reason}
                className="p-3.5 bg-zen-paper/60 rounded-xl border border-zen-sand/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-xs font-bold text-zen-charcoal line-clamp-2">
                      {item.reason}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                      {item.count} cases
                    </span>
                  </div>
                  {item.serviceTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.serviceTypes.map((st) => (
                        <span
                          key={st}
                          className="px-1.5 py-0.5 bg-white text-[9px] rounded text-zen-muted border border-zen-stone"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs text-emerald-700 font-medium">
              🌿 Excellent capacity utilization! Zero walk-in rejections recorded across the network today.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
