import React from 'react';

// 직업별 이미지 매핑 - 각 이미지 파일과 해당 직업의 위치 정보
const JOB_IMAGE_MAP: Record<string, { file: string; position: number; total: number }> = {
  // char_thumbs_1_second.png - 4개 캐릭터
  '다크로드': { file: 'char_thumbs_1_second.png', position: 0, total: 4 },
  '블러드이블': { file: 'char_thumbs_1_second.png', position: 1, total: 4 },
  '검신': { file: 'char_thumbs_1_second.png', position: 2, total: 4 },
  '인다라천': { file: 'char_thumbs_1_second.png', position: 3, total: 4 },

  // char_thumbs_2_second.png - 4개 캐릭터
  '마제스티': { file: 'char_thumbs_2_second.png', position: 0, total: 4 },
  '네메시스': { file: 'char_thumbs_2_second.png', position: 1, total: 4 },
  '디어사이드': { file: 'char_thumbs_2_second.png', position: 2, total: 4 },
  '검제': { file: 'char_thumbs_2_second.png', position: 3, total: 4 },

  // char_thumbs_3_second.png - 4개 캐릭터
  '염제폐월수화': { file: 'char_thumbs_3_second.png', position: 0, total: 4 },
  '카이저': { file: 'char_thumbs_3_second.png', position: 1, total: 4 },
  '용독문주': { file: 'char_thumbs_3_second.png', position: 2, total: 4 },
  '얼티밋디바': { file: 'char_thumbs_3_second.png', position: 3, total: 4 },

  // char_thumbs_4_second.png - 4개 캐릭터
  '레이븐': { file: 'char_thumbs_4_second.png', position: 0, total: 4 },
  '디스트로이어': { file: 'char_thumbs_4_second.png', position: 1, total: 4 },
  '프라임': { file: 'char_thumbs_4_second.png', position: 2, total: 4 },
  '커맨더': { file: 'char_thumbs_4_second.png', position: 3, total: 4 },

  // char_thumbs_5_second.png - 4개 캐릭터
  '오버마인드': { file: 'char_thumbs_5_second.png', position: 0, total: 4 },
  '지니위즈': { file: 'char_thumbs_5_second.png', position: 1, total: 4 },
  '아슈타르테': { file: 'char_thumbs_5_second.png', position: 2, total: 4 },
  '헤카테': { file: 'char_thumbs_5_second.png', position: 3, total: 4 },

  // char_thumbs_6_second.png - 5개 캐릭터
  '세라핌': { file: 'char_thumbs_6_second.png', position: 0, total: 5 },
  '인페르노': { file: 'char_thumbs_6_second.png', position: 1, total: 5 },
  '천선낭랑': { file: 'char_thumbs_6_second.png', position: 2, total: 5 },
  '리디머': { file: 'char_thumbs_6_second.png', position: 3, total: 5 },
  '이그제큐터': { file: 'char_thumbs_6_second.png', position: 4, total: 5 },

  // char_thumbs_7_second.png - 2개 캐릭터
  '세인트': { file: 'char_thumbs_7_second.png', position: 0, total: 2 },
  '저스티스': { file: 'char_thumbs_7_second.png', position: 1, total: 2 },

  // char_thumbs_8_second.png - 2개 캐릭터
  '테라치프': { file: 'char_thumbs_8_second.png', position: 0, total: 2 },
  '트라이브윙': { file: 'char_thumbs_8_second.png', position: 1, total: 2 },

  // char_thumbs_9_second.png - 4개 캐릭터
  '크림슨로제': { file: 'char_thumbs_9_second.png', position: 0, total: 4 },
  '스톰트루퍼': { file: 'char_thumbs_9_second.png', position: 1, total: 4 },
  '옵티머스': { file: 'char_thumbs_9_second.png', position: 2, total: 4 },
  '프레이야': { file: 'char_thumbs_9_second.png', position: 3, total: 4 },

  // char_thumbs_10_second.png - 2개 캐릭터
  '워로드': { file: 'char_thumbs_10_second.png', position: 0, total: 2 },
  '에레보스': { file: 'char_thumbs_10_second.png', position: 1, total: 2 },

  // char_thumbs_11_second.png - 2개 캐릭터
  '알키오네': { file: 'char_thumbs_11_second.png', position: 0, total: 2 },
  '시라누이': { file: 'char_thumbs_11_second.png', position: 1, total: 2 },
};

// 직업명을 정규화해서 매핑에서 찾는 함수
function findJobMapping(job?: string): { file: string; position: number; total: number } | null {
  if (!job) return null;

  // 공백 제거하고 소문자로 변환해서 비교
  const normalizedJob = job.replace(/\s+/g, '').toLowerCase();
  
  // 매핑된 직업들을 순회하면서 일치하는 것 찾기
  for (const [mappedJob, config] of Object.entries(JOB_IMAGE_MAP)) {
    const normalizedMappedJob = mappedJob.replace(/\s+/g, '').toLowerCase();
    
    // 입력된 직업명에 매핑된 직업명이 포함되어 있거나, 매핑된 직업명에 입력된 직업명이 포함되어 있으면 매치
    if (normalizedJob.includes(normalizedMappedJob) || normalizedMappedJob.includes(normalizedJob)) {
      return config;
    }
  }
  
  return null;
}

interface JobAvatarProps {
  job?: string;
  size?: number;
  className?: string;
}

export default function JobAvatar({ job, size = 70, className = "" }: JobAvatarProps) {
  const jobMapping = findJobMapping(job);
  
  // 매핑을 찾지 못한 경우 기본 아바타 표시
  if (!jobMapping) {
    return (
      <div 
        className={`relative overflow-hidden bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title={job || '알 수 없는 직업'}
      >
        <span className="text-xs text-slate-400">
          {job ? job.charAt(0) : '?'}
        </span>
      </div>
    );
  }

  const { file, position, total } = jobMapping;
  const imageUrl = `/images/${file}`;
  
  // 이미지 크기 계산 (실제 픽셀 기준)
  const imageWidth = total === 2 ? 512 : total === 4 ? 512 : total === 5 ? 800 : 512; // 추정값
  const characterWidth = imageWidth / total;
  const offsetX = position * characterWidth;
  
  return (
    <div 
      className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex-shrink-0 ${className}`}
      style={{ 
        width: size, 
        height: size
      }}
      title={job || '알 수 없는 직업'}
    >
      {/* 이미지 컨테이너 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: `${total * size}px ${size}px`, // 픽셀 단위로 정확히 설정
          backgroundPosition: `-${position * size}px center`, // 각 캐릭터의 크기만큼 이동
          backgroundRepeat: 'no-repeat',
          borderRadius: '50%'
        }}
      />
      
      {/* 로딩 실패 시 표시할 폴백 */}
      <div 
        className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 opacity-0 hover:opacity-100 transition-opacity"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '50%' }}
      >
        <span className="font-bold">
          {job ? job.charAt(0) : '?'}
        </span>
      </div>
    </div>
  );
}
