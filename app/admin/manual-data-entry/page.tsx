'use client';

import { useState } from 'react';

interface GuildMember {
  nickname: string;
  level: number;
  server: string;
  job: string;
  combatPower: number;
  guild: string;
  adventureName?: string;
  adventureLevel?: number;
  user_id?: string;
}

export default function ManualDataEntry() {
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [currentMember, setCurrentMember] = useState<GuildMember>({
    nickname: '',
    level: 0,
    server: '',
    job: '',
    combatPower: 0,
    guild: '',
    adventureName: '',
    adventureLevel: 0,
    user_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (field: keyof GuildMember, value: string | number) => {
    setCurrentMember(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addMember = () => {
    if (!currentMember.nickname || !currentMember.server || !currentMember.job) {
      setMessage('닉네임, 서버, 직업은 필수 입력 항목입니다.');
      return;
    }

    setMembers(prev => [...prev, { ...currentMember }]);
    setCurrentMember({
      nickname: '',
      level: 0,
      server: '',
      job: '',
      combatPower: 0,
      guild: '',
      adventureName: '',
      adventureLevel: 0,
      user_id: ''
    });
    setMessage('길드원이 추가되었습니다.');
  };

  const removeMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
    setMessage('길드원이 제거되었습니다.');
  };

  const updateDatabase = async () => {
    if (members.length === 0) {
      setMessage('업데이트할 길드원이 없습니다.');
      return;
    }

    setIsLoading(true);
    setMessage('데이터베이스 업데이트 중...');

    try {
      const response = await fetch('/api/admin/manual-data-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`성공적으로 ${result.updatedCount}명의 길드원 데이터를 업데이트했습니다.`);
        setMembers([]); // 성공 시 목록 초기화
      } else {
        setMessage(`업데이트 실패: ${result.error}`);
      }
    } catch (error) {
      setMessage(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (members.length === 0) {
      setMessage('내보낼 데이터가 없습니다.');
      return;
    }

    const csvContent = [
      ['닉네임', '레벨', '서버', '직업', '항마력', '길드', '모험단명', '모험단레벨', 'user_id'].join(','),
      ...members.map(m => [
        m.nickname,
        m.level,
        m.server,
        m.job,
        m.combatPower,
        m.guild,
        m.adventureName || '',
        m.adventureLevel || '',
        m.user_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `guild_members_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setMessage('CSV 파일이 다운로드되었습니다.');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">길드원 데이터 수동 입력</h1>
        
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.includes('성공') ? 'bg-green-100 text-green-800' : 
            message.includes('실패') || message.includes('오류') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 데이터 입력 폼 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">새 길드원 추가</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  닉네임 *
                </label>
                <input
                  type="text"
                  value={currentMember.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="닉네임을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    레벨
                  </label>
                  <input
                    type="number"
                    value={currentMember.level}
                    onChange={(e) => handleInputChange('level', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    항마력
                  </label>
                  <input
                    type="number"
                    value={currentMember.combatPower}
                    onChange={(e) => handleInputChange('combatPower', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    서버 *
                  </label>
                  <select
                    value={currentMember.server}
                    onChange={(e) => handleInputChange('server', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">서버 선택</option>
                    <option value="슈시아">슈시아</option>
                    <option value="패리스">패리스</option>
                    <option value="샤일록">샤일록</option>
                    <option value="칸나">칸나</option>
                    <option value="아이리스">아이리스</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    직업 *
                  </label>
                  <input
                    type="text"
                    value={currentMember.job}
                    onChange={(e) => handleInputChange('job', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="직업을 입력하세요"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  길드
                </label>
                <input
                  type="text"
                  value={currentMember.guild}
                  onChange={(e) => handleInputChange('guild', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="길드명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    모험단명
                  </label>
                  <input
                    type="text"
                    value={currentMember.adventureName || ''}
                    onChange={(e) => handleInputChange('adventureName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="모험단명"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    모험단 레벨
                  </label>
                  <input
                    type="number"
                    value={currentMember.adventureLevel || 0}
                    onChange={(e) => handleInputChange('adventureLevel', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID
                </label>
                <input
                  type="text"
                  value={currentMember.user_id || ''}
                  onChange={(e) => handleInputChange('user_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="User ID (선택사항)"
                />
              </div>

              <button
                onClick={addMember}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                길드원 추가
              </button>
            </div>
          </div>

          {/* 길드원 목록 및 관리 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">길드원 목록 ({members.length}명)</h2>
            
            {members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">추가된 길드원이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {members.map((member, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{member.nickname}</h3>
                      <button
                        onClick={() => removeMember(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>서버: {member.server}</div>
                      <div>직업: {member.job}</div>
                      <div>레벨: {member.level}</div>
                      <div>항마력: {member.combatPower.toLocaleString()}</div>
                      {member.guild && <div>길드: {member.guild}</div>}
                      {member.adventureName && <div>모험단: {member.adventureName} (Lv.{member.adventureLevel})</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {members.length > 0 && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={updateDatabase}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isLoading ? '업데이트 중...' : '데이터베이스 업데이트'}
                </button>
                
                <button
                  onClick={exportToCSV}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  CSV 내보내기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
