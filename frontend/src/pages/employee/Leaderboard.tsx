import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Flame, UserCheck, AlertCircle } from 'lucide-react';

const getOrdinalWord = (rank: number): string => {
  const words = [
    'First', 'Second', 'Third', 'Fourth', 'Fifth',
    'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
    'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth',
    'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'
  ];
  if (rank >= 1 && rank <= words.length) {
    return words[rank - 1];
  }
  const j = rank % 10, k = rank % 100;
  if (j === 1 && k !== 11) return `${rank}st`;
  if (j === 2 && k !== 12) return `${rank}nd`;
  if (j === 3 && k !== 13) return `${rank}rd`;
  return `${rank}th`;
};

export const Leaderboard: React.FC = () => {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [leaderboard, setLeaderboard] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/leaderboards`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setLeaderboard(data))
    .catch(console.error);
  }, [token]);

  if (!leaderboard) return <div className="loading-spinner">Loading...</div>;

  const myStats = leaderboard.myStats;
  const rawStreaks = leaderboard.highestStreak || [];
  const streaks = [...rawStreaks].sort((a: any, b: any) => {
    if (b.currentStreak !== a.currentStreak) {
      return b.currentStreak - a.currentStreak;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  // Calculate ranks: same streaks get the same position, 0 streak gets 'Last'
  let currentRank = 0;
  let prevStreak = -1;

  const rankedStreaks = streaks.map((item: any) => {
    if (!item.currentStreak || item.currentStreak === 0) {
      return {
        ...item,
        rank: 0,
        rankWord: 'Last',
      };
    }

    if (item.currentStreak !== prevStreak) {
      currentRank++;
      prevStreak = item.currentStreak;
    }

    return {
      ...item,
      rank: currentRank,
      rankWord: getOrdinalWord(currentRank),
    };
  });

  return (
    <div className="content-scroll" style={{ paddingBottom: '3rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Stats</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Panel 1: Your Stats */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: `1px solid ${isDark ? 'var(--border-color)' : '#e2e8f0'}`, paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.15rem', color: '#10b981' }}>
              <UserCheck size={20} color="#10b981" />
              <span>Your Stats</span>
            </h3>
            {myStats?.name && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {myStats.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Working Days */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px dashed ${isDark ? 'var(--border-color)' : '#e2e8f0'}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                <UserCheck size={18} color="#10b981" />
                Working Days:
              </span>
              <span style={{ fontWeight: 600, color: '#10b981', fontSize: '1rem' }}>
                {myStats ? `${myStats.totalPresent || 0} days` : '0 days'}
              </span>
            </div>

            {/* Attendance Count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px dashed ${isDark ? 'var(--border-color)' : '#e2e8f0'}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                <Trophy size={18} color="var(--primary-color)" />
                Attendance Count:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)', fontSize: '1rem' }}>
                {myStats ? `${myStats.salaryCount || 0} days` : '0 days'}
              </span>
            </div>

            {/* Absent */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px dashed ${isDark ? 'var(--border-color)' : '#e2e8f0'}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                <AlertCircle size={18} color="var(--danger-color)" />
                Absent:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--danger-color)', fontSize: '1rem' }}>
                {myStats ? `${myStats.totalAbsent || 0} days` : '0 days'}
              </span>
            </div>

            {/* Current Streak */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                <Flame size={18} color="#f97316" />
                Current Streak:
              </span>
              <span style={{ fontWeight: 600, color: '#f97316', fontSize: '1rem' }}>
                {myStats ? `${myStats.currentStreak || 0} 🔥` : '0 🔥'}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Streak Meter */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: `1px solid ${isDark ? 'var(--border-color)' : '#e2e8f0'}`, paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.15rem', color: '#f97316' }}>
              <Flame size={20} color="#f97316" />
              <span>Streak Meter</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All Team Members
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {rankedStreaks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No streak data available</p>
            ) : (
              rankedStreaks.map((item: any) => {
                const rankWord = item.rankWord;
                const isUser = user?.id === item.id;
                const isTop1 = item.rank === 1;
                const isTop2 = item.rank === 2;
                const isTop3 = item.rank === 3;

                let rankBadgeBg = isDark ? '#1e293b' : '#f1f5f9';
                let rankBadgeColor = isDark ? '#94a3b8' : '#64748b';
                let rankIcon = null;

                if (isTop1) {
                  rankBadgeBg = isDark ? '#78350f' : '#fef3c7';
                  rankBadgeColor = isDark ? '#fde68a' : '#b45309';
                  rankIcon = '🥇';
                } else if (isTop2) {
                  rankBadgeBg = isDark ? '#334155' : '#e2e8f0';
                  rankBadgeColor = isDark ? '#cbd5e1' : '#475569';
                  rankIcon = '🥈';
                } else if (isTop3) {
                  rankBadgeBg = isDark ? '#7c2d12' : '#ffedd5';
                  rankBadgeColor = isDark ? '#fed7aa' : '#c2410c';
                  rankIcon = '🥉';
                }

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      background: isUser
                        ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)')
                        : (isDark ? 'var(--card-bg-alt)' : '#ffffff'),
                      border: isUser
                        ? '1px solid var(--primary-color)'
                        : `1px solid ${isDark ? 'var(--border-color)' : '#e2e8f0'}`,
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          background: rankBadgeBg,
                          color: rankBadgeColor,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {rankIcon && <span>{rankIcon}</span>}
                        <span>{rankWord}</span>
                      </div>

                      <div style={{ fontWeight: isUser ? 700 : 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                        {isUser && (
                          <span style={{
                            marginLeft: '0.45rem',
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: 'var(--primary-color)',
                            color: 'white',
                            fontWeight: 600
                          }}>
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                      <span style={{
                        fontWeight: 700,
                        color: item.currentStreak > 0 ? '#f97316' : 'var(--text-muted)',
                        fontSize: '1.05rem'
                      }}>
                        {item.currentStreak}
                      </span>
                      <span style={{ fontSize: '0.85rem' }}>🔥</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
