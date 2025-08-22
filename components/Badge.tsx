'use client';

import React, { useState } from 'react';
import { Badge as BadgeType } from '@/types/guild';

interface BadgeProps {
  badge: BadgeType;
}

export default function Badge({ badge }: BadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        className="w-8 h-8 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 flex items-center justify-center overflow-hidden"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {/* 뱃지 이미지 또는 첫 글자 */}
        {badge.iconUrl ? (
          <div
            className="w-8 h-8 rounded-full bg-center bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url("${badge.iconUrl}")`
            }}
            title={badge.name}
          />
        ) : (
          <span className="text-xs font-bold text-gray-600">
            {badge.name?.charAt(0) || '?'}
          </span>
        )}
      </div>
      
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-[200px] max-w-[300px]">
            <div className="font-semibold mb-2 text-yellow-400">{badge.name}</div>
            <div className="border-t border-gray-700 pt-2">
              <div className="text-gray-400 text-xs mb-1">획득 조건 : {badge.earnedCondition}</div>
              <div className="text-gray-400 text-xs">획득일 : {new Date(badge.earnedAt).toLocaleDateString()}</div>
            </div>
            {/* 툴팁 화살표 */}
            <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
