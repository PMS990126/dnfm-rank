'use client';

interface TitleProps {
  title: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'unique' | 'epic';
}

const rarityStyles = {
  common: {
    bg: 'bg-gray-200',
    border: 'border-gray-400',
    text: 'text-gray-800'
  },
  uncommon: {
    bg: 'bg-blue-200',
    border: 'border-blue-400',
    text: 'text-blue-800'
  },
  rare: {
    bg: 'bg-purple-200',
    border: 'border-purple-400',
    text: 'text-purple-800'
  },
  unique: {
    bg: 'bg-pink-200',
    border: 'border-pink-400',
    text: 'text-pink-800'
  },
  epic: {
    bg: 'bg-yellow-200',
    border: 'border-yellow-600',
    text: 'text-yellow-900'
  }
};

export default function Title({ title, rarity = 'common' }: TitleProps) {
  const style = rarityStyles[rarity];
  
  return (
    <div className={`inline-flex items-center ${style.bg} ${style.text} px-2 py-1 rounded-md text-xs font-bold shadow-sm border-2 ${style.border}`}>
      {title}
    </div>
  );
}
