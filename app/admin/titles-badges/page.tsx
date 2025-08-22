'use client';

import React, { useState, useEffect } from 'react';
import { Badge as BadgeType } from '@/types/guild';

interface User {
  authorKey: string;
  nickname: string;
  server: string;
  title?: string;
  badges: BadgeType[];
}

interface BadgeDefinition {
  id: number;
  name: string;
  description: string;
  icon_url: string;
}

export default function TitlesBadgesAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [titleInput, setTitleInput] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [earnedCondition, setEarnedCondition] = useState('');
  const [loading, setLoading] = useState(false);

  // 샘플 사용자 데이터 (실제로는 DB에서 가져와야 함)
  const sampleUsers = [
    { authorKey: '카인:모험가1', nickname: '모험가1', server: '카인' },
    { authorKey: '카인:모험가2', nickname: '모험가2', server: '카인' },
    { authorKey: '카인:모험가3', nickname: '모험가3', server: '카인' },
    { authorKey: '카인:모험가4', nickname: '모험가4', server: '카인' },
    { authorKey: '카인:모험가5', nickname: '모험가5', server: '카인' },
  ];

  useEffect(() => {
    loadBadgeDefinitions();
    loadUsersData();
  }, []);

  const loadBadgeDefinitions = async () => {
    try {
      const response = await fetch('/api/badge-definitions');
      const data = await response.json();
      setBadgeDefinitions(data.badges || []);
    } catch (error) {
      console.error('Failed to load badge definitions:', error);
    }
  };

  const loadUsersData = async () => {
    // 실제로는 모든 길드원의 데이터를 가져와야 하지만, 여기서는 샘플 데이터 사용
    const usersWithData = await Promise.all(
      sampleUsers.map(async (user) => {
        try {
          // 칭호 가져오기
          const titleResponse = await fetch(`/api/titles?authorKey=${encodeURIComponent(user.authorKey)}`);
          const titleData = await titleResponse.json();
          
          // 뱃지 가져오기
          const badgeResponse = await fetch(`/api/badges?authorKey=${encodeURIComponent(user.authorKey)}`);
          const badgeData = await badgeResponse.json();
          
          return {
            ...user,
            title: titleData.title,
            badges: badgeData.badges || []
          };
        } catch (error) {
          console.error(`Failed to load data for ${user.nickname}:`, error);
          return { ...user, badges: [] };
        }
      })
    );
    setUsers(usersWithData);
  };

  const handleSetTitle = async () => {
    if (!selectedUser || !titleInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorKey: selectedUser,
          title: titleInput.trim()
        })
      });
      
      if (response.ok) {
        await loadUsersData();
        setTitleInput('');
        alert('칭호가 설정되었습니다.');
      }
    } catch (error) {
      console.error('Failed to set title:', error);
      alert('칭호 설정에 실패했습니다.');
    }
    setLoading(false);
  };

  const handleAwardBadge = async () => {
    if (!selectedUser || !selectedBadge || !earnedCondition.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorKey: selectedUser,
          badgeId: parseInt(selectedBadge),
          earnedCondition: earnedCondition.trim()
        })
      });
      
      if (response.ok) {
        await loadUsersData();
        setSelectedBadge('');
        setEarnedCondition('');
        alert('뱃지가 부여되었습니다.');
      }
    } catch (error) {
      console.error('Failed to award badge:', error);
      alert('뱃지 부여에 실패했습니다.');
    }
    setLoading(false);
  };

  const handleRemoveBadge = async (authorKey: string, badgeId: number) => {
    if (!confirm('정말로 이 뱃지를 제거하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/badges?authorKey=${encodeURIComponent(authorKey)}&badgeId=${badgeId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadUsersData();
        alert('뱃지가 제거되었습니다.');
      } else {
        alert('뱃지 제거에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to remove badge:', error);
      alert('뱃지 제거에 실패했습니다.');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">칭호 및 뱃지 관리</h1>
      
      {/* 관리 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 칭호 설정 */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">칭호 설정</h2>
          <div className="space-y-3">
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
            >
              <option value="">사용자 선택</option>
              {users.map(user => (
                <option key={user.authorKey} value={user.authorKey}>
                  {user.nickname} ({user.server})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="칭호 입력"
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
            />
            <button
              onClick={handleSetTitle}
              disabled={loading || !selectedUser || !titleInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white p-2 rounded"
            >
              칭호 설정
            </button>
          </div>
        </div>

        {/* 뱃지 부여 */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">뱃지 부여</h2>
          <div className="space-y-3">
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
            >
              <option value="">사용자 선택</option>
              {users.map(user => (
                <option key={user.authorKey} value={user.authorKey}>
                  {user.nickname} ({user.server})
                </option>
              ))}
            </select>
            <select 
              value={selectedBadge} 
              onChange={(e) => setSelectedBadge(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
            >
              <option value="">뱃지 선택</option>
              {badgeDefinitions.map(badge => (
                <option key={badge.id} value={badge.id.toString()}>
                  {badge.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={earnedCondition}
              onChange={(e) => setEarnedCondition(e.target.value)}
              placeholder="획득 조건"
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded"
            />
            <button
              onClick={handleAwardBadge}
              disabled={loading || !selectedUser || !selectedBadge || !earnedCondition.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white p-2 rounded"
            >
              뱃지 부여
            </button>
          </div>
        </div>
      </div>

      {/* 현재 상태 */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">현재 칭호 및 뱃지 현황</h2>
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.authorKey} className="border border-slate-600 p-4 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">
                  {user.nickname} ({user.server})
                </div>
                <div className="text-sm text-slate-400">
                  {user.title ? (
                    <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs">
                      👑 {user.title}
                    </span>
                  ) : (
                    <span className="text-slate-500">칭호 없음</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.badges.length > 0 ? (
                  user.badges.map(badge => (
                    <div 
                      key={badge.id} 
                      className="flex items-center gap-2 bg-slate-700 px-3 py-1 rounded text-sm"
                    >
                      <span>{badge.name}</span>
                      <button
                        onClick={() => handleRemoveBadge(user.authorKey, badge.id)}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">뱃지 없음</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
