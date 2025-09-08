import React from 'react';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

const VersionIndicator: React.FC = () => {
  const { flags } = useFeatureFlags();
  
  const isV2 = flags.UNBORKED_V2;
  
  return (
    <div 
      className={`fixed bottom-4 right-4 text-sm font-medium z-50 ${
        isV2 
          ? 'flex items-center bg-[#0D0221] text-[#00FFF1] border border-[#00FFF1] p-2 font-["Rajdhani",sans-serif] uppercase' 
          : 'bg-[#39ff14] text-[#1a1a2e] p-2 rounded-full'
      }`}
    >
      {isV2 ? (
        <>
          <span className="w-2 h-2 bg-[#FF003C] mr-2 animate-pulse"></span>
          <span>CYBERPUNK.MODE</span>
        </>
      ) : 'Original v1'}
    </div>
  );
};

export default VersionIndicator; 