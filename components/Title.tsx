'use client';

import React from 'react';

interface TitleProps {
  title: string;
}

export default function Title({ title }: TitleProps) {
  return (
    <div className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
      {title}
    </div>
  );
}
