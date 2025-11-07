// app/components/TipsterAllTips.tsx

// 🛑 REMOVED: import React from 'react'; (No longer needed)

// --- TYPE DEFINITIONS (Copied from the Review file logic) ---

type TipObject = {
  main: number;
  alt: number | null;
};
type ReviewData = {
  tipster_id: number;
  tipster_nickname: string;
  tips: Record<string, TipObject>;
  points: Record<string, number>;
  odds: Record<string, number>;
};
type AugmentedReviewData = ReviewData & {
  totalPoints: number;
  totalOdds: number;
  hasTipped: boolean;
};

// 💡 Props are based on the data returned by the /api/raceday-review loader
interface TipsterAllTipsProps {
  tipsTableData: AugmentedReviewData[];
  pointsTableData: AugmentedReviewData[];
  oddsTableData: AugmentedReviewData[];
  raceNumbers: number[];
}

// --- Component ---

export function TipsterAllTips({
  tipsTableData,
  pointsTableData,
  oddsTableData,
  raceNumbers,
}: TipsterAllTipsProps) {

  // CSS classes for tables (Copied from review.tsx)
  const thClasses = "p-2 border border-gray-300 bg-mainlight text-left text-sm font-bold";
  const tdClasses = "p-2 border border-gray-300 text-sm";
  const tipsterCellClasses = `${tdClasses} font-medium sticky left-0 bg-white/90`;
  const headerCellClasses = `${thClasses} text-center sticky top-0`;
  const totalCellClasses = `${tdClasses} text-center font-bold bg-gray-50`;

  return (
    // 💡 MODIFIED: Added w-full wrapper to match MyTipsSection
    <div className="w-full"> 
      
      {/* 💡 MODIFIED: Added Header to match MyTipsSection styling */}
      <div className="flex items-center justify-between p-4 bg-gradient-custom text-white rounded-t-2xl">
          {/* Left side: Icon and Title */}
          <div className="flex items-center space-x-3">
              <span className="material-symbols-outlined text-3xl">
                  Border_All {/* Changed icon for "View All" */}
              </span>
              <h2 className="text-2xl font-heading font-semibold">
                  All Tips
              </h2>
          </div>
      </div>

      {/* 💡 MODIFIED: Changed perimeter div to match MyTipsSection content container */}
      <div className="bg-white p-6 shadow-lg rounded-b-2xl border border-gray-100 border-t-0 space-y-12 mb-12">
        
        {/* REMOVED: Redundant H1 "Tipster Review Detail" */}

        {/* --- TABLE 1: TIPS (Internal content unchanged) --- */}
        <section>
          <h2 className="text-2xl font-bold text-main mb-4">Tipster Selections</h2>
          <div className="overflow-x-auto relative border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${headerCellClasses} left-0`}>Tipster</th>
                  {raceNumbers.map((num) => (
                    <th key={num} className={headerCellClasses}>{`R${num}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tipsTableData.map((tipster) => (
                  <tr key={tipster.tipster_id} className="hover:bg-gray-50">
                    <td className={tipsterCellClasses}>
                      {tipster.tipster_nickname}
                    </td>
                    {raceNumbers.map((num) => {
                      const tip = tipster.tips[num];
                      let displayTip = "-";
                      if (tipster.hasTipped && tip) {
                        if (tip.alt) {
                          displayTip = `${tip.main} s${tip.alt}`;
                        } else {
                          displayTip = String(tip.main);
                        }
                      }
                      
                      return (
                        <td key={num} className={`${tdClasses} text-center`}>
                          {!tipster.hasTipped ? <span className="text-greymain">-</span> : displayTip}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- TABLE 2: POINTS (Internal content unchanged) --- */}
        <section>
          <h2 className="text-2xl font-bold text-main mb-4">Points Earned</h2>
          <div className="overflow-x-auto relative border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${headerCellClasses} left-0`}>Tipster</th>
                  {raceNumbers.map((num) => (
                    <th key={num} className={headerCellClasses}>{`R${num}`}</th>
                  ))}
                  <th className={headerCellClasses}>Total</th>
                </tr>
              </thead>
              <tbody>
                {pointsTableData.map((tipster) => (
                  <tr key={tipster.tipster_id} className="hover:bg-gray-50">
                    <td className={tipsterCellClasses}>
                      {tipster.tipster_nickname}
                    </td>
                    {raceNumbers.map((num) => {
                      const points = tipster.points[num] || 0;
                      const cellBg = points > 0 ? 'bg-second' : '';
                      const cellText = !tipster.hasTipped ? 'text-greymain' : (points === 0 ? 'text-mainlight' : '');
                      return (
                        <td key={num} className={`${tdClasses} text-center ${cellBg} ${cellText}`}>
                          {!tipster.hasTipped ? "-" : points}
                        </td>
                      );
                    })}
                    <td className={totalCellClasses}>
                      {!tipster.hasTipped ? <span className="text-greymain">-</span> : tipster.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- TABLE 3: ODDS (Internal content unchanged) --- */}
        <section>
          <h2 className="text-2xl font-bold text-main mb-4">Odds Earned</h2>
          <div className="overflow-x-auto relative border border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${headerCellClasses} left-0`}>Tipster</th>
                  {raceNumbers.map((num) => (
                    <th key={num} className={headerCellClasses}>{`R${num}`}</th>
                  ))}
                  <th className={headerCellClasses}>Total</th>
                </tr>
              </thead>
              <tbody>
                {oddsTableData.map((tipster) => (
                  <tr key={tipster.tipster_id} className="hover:bg-gray-50">
                    <td className={tipsterCellClasses}>
                      {tipster.tipster_nickname}
                    </td>
                    {raceNumbers.map((num) => {
                      const odds = tipster.odds[num] || 0;
                      const cellBg = odds > 0 ? 'bg-second' : '';
                      const cellText = !tipster.hasTipped ? 'text-greymain' : (odds === 0 ? 'text-mainlight' : '');
                      return (
                        <td key={num} className={`${tdClasses} text-center ${cellBg} ${cellText}`}>
                          {!tipster.hasTipped ? "-" : odds.toFixed(2)}
                        </td>
                      );
                    })}
                    <td className={totalCellClasses}>
                      {!tipster.hasTipped ? <span className="text-greymain">-</span> : tipster.totalOdds.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}