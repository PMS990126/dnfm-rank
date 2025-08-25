'use client';

import { useState } from 'react';

export default function ManualUpdatePage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFindingUserIds, setIsFindingUserIds] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [userIdResult, setUserIdResult] = useState<any>(null);
  const [bulkUpdateResult, setBulkUpdateResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleManualUpdate = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/manual-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || '업데이트 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFindUserIds = async () => {
    if (isFindingUserIds) return;
    
    setIsFindingUserIds(true);
    setError(null);
    setUserIdResult(null);

    try {
      const response = await fetch('/api/admin/auto-find-user-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUserIdResult(data);
      } else {
        setError(data.error || 'user_id 찾기 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsFindingUserIds(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (isBulkUpdating) return;
    
    setIsBulkUpdating(true);
    setError(null);
    setBulkUpdateResult(null);

    try {
      const response = await fetch('/api/admin/bulk-update-user-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setBulkUpdateResult(data);
      } else {
        setError(data.error || '일괄 업데이트 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🚀 길드 관리자 도구
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              길드원들의 프로필 정보를 관리하고 업데이트할 수 있습니다.
            </p>
          </div>

          {/* profile-url.txt 기반 일괄 업데이트 섹션 */}
          <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">
              📁 profile-url.txt 기반 일괄 업데이트
            </h2>
            <p className="text-purple-700 mb-4">
              profile-url.txt 파일의 URL들을 읽어서 DB의 길드원들에게 user_id를 일괄 할당합니다.
            </p>
            <p className="text-sm text-purple-600 mb-4">
              ⚠️ 이 기능은 profile-url.txt 파일이 프로젝트 루트에 있어야 합니다.
            </p>
            <button
              onClick={handleBulkUpdate}
              disabled={isBulkUpdating}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                isBulkUpdating
                  ? 'bg-purple-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
              }`}
            >
              {isBulkUpdating ? '📁 일괄 업데이트 중...' : '📁 profile-url.txt로 일괄 업데이트'}
            </button>
          </div>

          {/* user_id 자동 찾기 섹션 */}
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              🔍 user_id 자동 찾기
            </h2>
            <p className="text-blue-700 mb-4">
              user_id가 없는 길드원들을 자동으로 찾아서 업데이트합니다.
            </p>
            <button
              onClick={handleFindUserIds}
              disabled={isFindingUserIds}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                isFindingUserIds
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isFindingUserIds ? '🔍 찾는 중...' : '🔍 user_id 찾기 시작'}
            </button>
          </div>

          {/* 수동 업데이트 섹션 */}
          <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-xl font-semibold text-green-900 mb-4">
              📊 프로필 수동 업데이트
            </h2>
            <p className="text-green-700 mb-4">
              길드원들의 프로필 정보를 수동으로 업데이트합니다.
            </p>
            <p className="text-sm text-green-600 mb-4">
              ⚠️ 업데이트는 시간이 걸릴 수 있으며, 서버 부하를 방지하기 위해 각 길드원마다 2초의 지연이 있습니다.
            </p>
            <button
              onClick={handleManualUpdate}
              disabled={isUpdating}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                isUpdating
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
              }`}
            >
              {isUpdating ? '🔄 업데이트 중...' : '🚀 업데이트 시작'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">❌ 오류 발생</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* 일괄 업데이트 결과 */}
          {bulkUpdateResult && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-purple-800 font-semibold mb-2">📁 일괄 업데이트 결과</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium">총 URL:</span> {bulkUpdateResult.summary.totalUrls}개
                </div>
                <div>
                  <span className="font-medium">총 길드원:</span> {bulkUpdateResult.summary.totalMembers}명
                </div>
                <div>
                  <span className="font-medium">성공:</span> {bulkUpdateResult.summary.successCount}명
                </div>
                <div>
                  <span className="font-medium">실패:</span> {bulkUpdateResult.summary.failCount}명
                </div>
                <div>
                  <span className="font-medium">스킵:</span> {bulkUpdateResult.summary.skipCount}명
                </div>
                <div>
                  <span className="font-medium">소요시간:</span> {bulkUpdateResult.summary.duration}
                </div>
              </div>
              
              {bulkUpdateResult.summary.updatedMembers && bulkUpdateResult.summary.updatedMembers.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-purple-700 mb-2">✅ 업데이트된 길드원들:</h4>
                  <ul className="space-y-1 text-sm">
                    {bulkUpdateResult.summary.updatedMembers.map((member: any, index: number) => (
                      <li key={index} className="text-purple-600">
                        {member.nickname}: user_id {member.userId} 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          member.matchedType === '정확한 매치' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.matchedType}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {bulkUpdateResult.summary.failedMembers && bulkUpdateResult.summary.failedMembers.length > 0 && (
                <div>
                  <h4 className="font-medium text-purple-700 mb-2">❌ 실패한 항목들:</h4>
                  <ul className="space-y-1 text-sm">
                    {bulkUpdateResult.summary.failedMembers.map((member: any, index: number) => (
                      <li key={index} className="text-purple-600">
                        {member.nickname}: {member.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* user_id 찾기 결과 */}
          {userIdResult && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-blue-800 font-semibold mb-2">🔍 user_id 찾기 결과</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium">총 길드원:</span> {userIdResult.summary.totalMembers}명
                </div>
                <div>
                  <span className="font-medium">찾음:</span> {userIdResult.summary.foundCount}명
                </div>
                <div>
                  <span className="font-medium">못찾음:</span> {userIdResult.summary.notFoundCount}명
                </div>
                <div>
                  <span className="font-medium">소요시간:</span> {userIdResult.summary.duration}
                </div>
              </div>
              
              {userIdResult.summary.foundMembers && userIdResult.summary.foundMembers.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-blue-700 mb-2">✅ 찾은 user_id들:</h4>
                  <ul className="space-y-1 text-sm">
                    {userIdResult.summary.foundMembers.map((member: any, index: number) => (
                      <li key={index} className="text-blue-600">
                        {member.nickname}: {member.userId}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {userIdResult.summary.notFoundMembers && userIdResult.summary.notFoundMembers.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">❌ 못찾은 길드원들:</h4>
                  <ul className="space-y-1 text-sm">
                    {userIdResult.summary.notFoundMembers.map((member: any, index: number) => (
                      <li key={index} className="text-blue-600">
                        {member.nickname}: {member.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 업데이트 결과 */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-green-800 font-semibold mb-2">✅ 업데이트 완료</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">총 길드원:</span> {result.summary.totalMembers}명
                  </div>
                  <div>
                    <span className="font-medium">성공:</span> {result.summary.successCount}명
                  </div>
                  <div>
                    <span className="font-medium">실패:</span> {result.summary.failCount}명
                  </div>
                  <div>
                    <span className="font-medium">소요시간:</span> {result.summary.duration}
                  </div>
                </div>
              </div>

              {result.summary.failedMembers && result.summary.failedMembers.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-yellow-800 font-semibold mb-2">⚠️ 실패한 길드원들</h3>
                  <ul className="space-y-1">
                    {result.summary.failedMembers.map((member: any, index: number) => (
                      <li key={index} className="text-yellow-700 text-sm">
                        <span className="font-medium">{member.nickname}:</span> {member.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-gray-800 font-semibold mb-2">📊 상세 정보</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>시작 시간: {result.summary.startedAt}</div>
                  <div>완료 시간: {result.summary.completedAt}</div>
                  <div>항마력 변동 계산: {result.summary.deltaCalculated ? '✅ 완료' : '❌ 실패'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
