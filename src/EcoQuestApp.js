import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Camera, Bell, Award, Map, BarChart, MessageSquare, Settings, 
  Trash, Leaf, Home, User, X, ChevronLeft, Star, 
  Calendar, Search, Share2, BookOpen, Gift, ShieldAlert
} from 'lucide-react';

// 카카오맵 스크립트 로드를 위한 훅
const useScript = (src) => {
  const [status, setStatus] = useState(src ? "loading" : "idle");

  useEffect(() => {
    if (!src) {
      setStatus("idle");
      return;
    }

    // 이미 스크립트가 존재하는지 확인
    let script = document.querySelector(`script[src="${src}"]`);

    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.setAttribute("data-status", "loading");
      document.body.appendChild(script);

      const setAttributeFromEvent = (event) => {
        script.setAttribute(
          "data-status",
          event.type === "load" ? "ready" : "error"
        );
      };

      script.addEventListener("load", setAttributeFromEvent);
      script.addEventListener("error", setAttributeFromEvent);
    } else {
      setStatus(script.getAttribute("data-status"));
    }

    const setStateFromEvent = (event) => {
      setStatus(event.type === "load" ? "ready" : "error");
    };

    script.addEventListener("load", setStateFromEvent);
    script.addEventListener("error", setStateFromEvent);

    return () => {
      if (script) {
        script.removeEventListener("load", setStateFromEvent);
        script.removeEventListener("error", setStateFromEvent);
      }
    };
  }, [src]);

  return status;
};

// 로컬 스토리지 관리 커스텀 훅
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error storing to localStorage:", error);
    }
  };

  return [storedValue, setValue];
};

// 위치 거리 계산 유틸리티 함수
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const deg2rad = (deg) => deg * (Math.PI/180);
  const R = 6371; // 지구 반경 (km)
  const dLat = deg2rad(lat2-lat1);
  const dLng = deg2rad(lng2-lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // 거리 (km)
  return d;
};

// 날짜 포맷 유틸리티 함수
const formatDate = (date) => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
};

// 메인 앱 컴포넌트
const EcoQuestApp = () => {
  // 상태 관리
  const [activeTab, setActiveTab] = useLocalStorage('ecoquest-active-tab', 'home');
  const [userPoints, setUserPoints] = useLocalStorage('ecoquest-points', 750);
  const [rank, setRank] = useLocalStorage('ecoquest-rank', 12);
  const [level, setLevel] = useState(Math.floor(userPoints / 100) + 1);
  const [isARActive, setIsARActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [theme, setTheme] = useLocalStorage('ecoquest-theme', 'light');
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useLocalStorage('notifications-enabled', true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useLocalStorage('user-logged-in', true);
  const [showTutorial, setShowTutorial] = useLocalStorage('show-tutorial', false);
  
  // 무단투기 핫스팟 데이터
  const [hotspots, setHotspots] = useLocalStorage('ecoquest-hotspots', [
    { id: 1, name: '배밭골 원룸촌 입구', level: 'high', lastReport: '10분 전', lat: 37.602, lng: 127.015, reportCount: 12 },
    { id: 2, name: '정릉시장 뒷골목', level: 'medium', lastReport: '1시간 전', lat: 37.603, lng: 127.018, reportCount: 8 },
    { id: 3, name: '대학가 상점 거리', level: 'low', lastReport: '어제', lat: 37.601, lng: 127.013, reportCount: 3 },
    { id: 4, name: '정릉초등학교 앞', level: 'medium', lastReport: '2시간 전', lat: 37.604, lng: 127.017, reportCount: 7 }
  ]);
  
  // 쓰레기 몬스터 데이터
  const [monsters, setMonsters] = useLocalStorage('ecoquest-monsters', [
    { id: 1, name: '쓰레기몬', type: '플라스틱', points: 50, location: '배밭골 원룸촌', captured: false, image: '🗑️', lat: 37.602, lng: 127.015, rarity: 'common' },
    { id: 2, name: '페트병 드래곤', type: '플라스틱', points: 70, location: '정릉시장 뒷골목', captured: false, image: '🧪', lat: 37.6031, lng: 127.0185, rarity: 'rare' },
    { id: 3, name: '종이 고스트', type: '종이', points: 30, location: '대학가 상점 거리', captured: true, image: '📄', lat: 37.6011, lng: 127.0129, rarity: 'common' },
    { id: 4, name: '캔 골렘', type: '금속', points: 60, location: '배밭골 원룸촌', captured: false, image: '🥫', lat: 37.6022, lng: 127.0155, rarity: 'uncommon' },
    { id: 5, name: '비닐 뱀프', type: '플라스틱', points: 45, location: '정릉초등학교 앞', captured: false, image: '🛍️', lat: 37.604, lng: 127.017, rarity: 'common' },
    { id: 6, name: '유리병 마법사', type: '유리', points: 80, location: '정릉동 공원', captured: false, image: '🧙‍♂️', lat: 37.605, lng: 127.014, rarity: 'rare' }
  ]);
  
  // 알림 데이터
  const [notifications, setNotifications] = useLocalStorage('ecoquest-notifications', [
    { id: 1, time: '15분 전', message: '배밭골 원룸촌에 무단투기 발생 가능성이 높습니다', urgent: true, read: false },
    { id: 2, time: '1시간 전', message: '정릉시장 뒷골목에 새로운 몬스터가 나타났습니다', urgent: false, read: false },
    { id: 3, time: '3시간 전', message: '오늘의 미션: 플라스틱 몬스터 3마리 포획하기', urgent: false, read: true },
    { id: 4, time: '어제', message: '축하합니다! EcoQuest 레벨 7에 도달했습니다!', urgent: false, read: true }
  ]);

  // 미션 데이터
  const [missions, setMissions] = useLocalStorage('ecoquest-missions', [
    { id: 1, title: '플라스틱 몬스터 3마리 포획하기', type: 'daily', reward: 150, completed: false, progress: 1, total: 3 },
    { id: 2, title: '무단투기 핫스팟 신고하기', type: 'daily', reward: 100, completed: false, progress: 0, total: 1 },
    { id: 3, title: '친구 3명 초대하기', type: 'weekly', reward: 300, completed: false, progress: 1, total: 3 },
    { id: 4, title: '커뮤니티 활동 참여하기', type: 'weekly', reward: 250, completed: false, progress: 0, total: 1 }
  ]);

  // 배지 데이터
  const [badges, setBadges] = useLocalStorage('ecoquest-badges', [
    { id: 1, name: '플라스틱 사냥꾼', description: '플라스틱 몬스터 10마리 포획', progress: 4, total: 10, unlocked: false, image: '🏆' },
    { id: 2, name: '환경 지킴이', description: '무단투기 신고 5회', progress: 3, total: 5, unlocked: false, image: '🛡️' },
    { id: 3, name: '재활용 마스터', description: '재활용 퀘스트 20회 완료', progress: 12, total: 20, unlocked: false, image: '♻️' },
    { id: 4, name: '커뮤니티 스타', description: '커뮤니티 활동 10회 참여', progress: 7, total: 10, unlocked: false, image: '⭐' },
    { id: 5, name: '에코 히어로', description: 'EcoQuest 레벨 10 달성', progress: level, total: 10, unlocked: false, image: '🦸‍♂️' }
  ]);

  // 친구 데이터
  const [friends, setFriends] = useState([
    { id: 1, name: '에코지킴이', level: 12, points: 1245, lastActive: '30분 전', avatar: '👨‍🌾' },
    { id: 2, name: '그린워커', level: 9, points: 950, lastActive: '1시간 전', avatar: '👩‍🔬' },
    { id: 3, name: '환경전사', level: 15, points: 1520, lastActive: '어제', avatar: '🧝‍♂️' }
  ]);

  // 이벤트 데이터
  const [events, setEvents] = useState([
    { 
      id: 1, 
      title: '에코 그래피티 벽화 그리기', 
      description: '정릉3동 배밭골 원룸촌 입구의 지저분한 담벼락을 환경 테마로 꾸미는 벽화 그리기 활동입니다. 사전 디자인이 준비되어 있어 미술 실력이 없어도 참여 가능합니다!',
      date: '2023-04-22T10:00:00',
      location: '배밭골 원룸촌 입구',
      participants: 23,
      reward: 300,
      category: '환경예술',
      image: '🎨'
    },
    { 
      id: 2, 
      title: '업사이클링 워크샵', 
      description: '버려지는 플라스틱 병과 캔을 활용해 실용적인 소품을 만드는 워크샵입니다. 참가자는 빈 페트병이나 캔을 3개 이상 가져오셔야 합니다.',
      date: '2023-04-26T19:00:00',
      location: '주민센터',
      participants: 15,
      reward: 200,
      category: '재활용',
      image: '🧶'
    },
    { 
      id: 3, 
      title: '정릉천 플로깅', 
      description: '뛰거나 걸으면서 쓰레기를 줍는 플로깅 활동입니다. 운동도 하고 환경도 지키는 일석이조 활동에 함께해요!',
      date: '2023-04-30T09:00:00',
      location: '정릉천 산책로',
      participants: 31,
      reward: 250,
      category: '클린업',
      image: '🏃‍♀️'
    }
  ]);

  // 통계 데이터
  const [stats, setStats] = useState({
    weeklyActivity: [
      { day: '월', points: 60 },
      { day: '화', points: 120 },
      { day: '수', points: 80 },
      { day: '목', points: 40 },
      { day: '금', points: 100 },
      { day: '토', points: 180 },
      { day: '일', points: 90 }
    ],
    environmentalImpact: {
      trashReduction: 67,
      recyclingRate: 42,
      participationRate: 28,
      co2Reduction: 32,
      resourcesSaved: 120
    },
    monsterCaptureStats: {
      plastic: 7,
      paper: 4,
      metal: 3,
      glass: 1,
      total: 15
    }
  });

  // 현재 위치 가져오기
  useEffect(() => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoadingLocation(false);
        },
        (error) => {
          console.error('위치 가져오기 오류:', error);
          // 기본 위치로 설정 (정릉3동 중심점으로 가정)
          setUserLocation({ lat: 37.602, lng: 127.015 });
          setLoadingLocation(false);
        }
      );
    } else {
      console.error('이 브라우저는 위치 정보를 지원하지 않습니다');
      setUserLocation({ lat: 37.602, lng: 127.015 });
      setLoadingLocation(false);
    }
  }, []);

  // 레벨 계산 - 포인트가 변경될 때마다 업데이트
  useEffect(() => {
    const newLevel = Math.floor(userPoints / 100) + 1;
    
    if (newLevel !== level) { // 변경: 레벨이 달라질 때만 실행
      setLevel(newLevel);
      
      if (newLevel > level) { // 레벨업인 경우에만
        // 레벨업 알림 추가
        const newNotification = {
          id: Date.now(),
          time: '방금',
          message: `축하합니다! EcoQuest 레벨 ${newLevel}에 도달했습니다!`,
          urgent: false,
          read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
        
        // 에코 히어로 배지 업데이트
        const updatedBadges = badges.map(badge => 
          badge.id === 5 ? { ...badge, progress: newLevel } : badge
        );
        setBadges(updatedBadges);
      }
    }
  }, [userPoints, level, badges, setNotifications, setBadges]);
  // 배지 진행 상황 체크
  useEffect(() => {
    // 잠금 해제 대상 배지가 있는지 먼저 확인
    const hasUnlockableBadge = badges.some(badge => 
      badge.progress >= badge.total && !badge.unlocked
    );
    
    if (hasUnlockableBadge) {
      const updatedBadges = badges.map(badge => {
        // 배지 진행률이 목표치에 도달하고 아직 잠금 해제가 안 된 경우만
        if (badge.progress >= badge.total && !badge.unlocked) {
          // 배지 획득 알림
          const newNotification = {
            id: Date.now(),
            time: '방금',
            message: `새로운 배지를 획득했습니다: ${badge.name}`,
            urgent: false,
            read: false
          };
          setNotifications(prev => [newNotification, ...prev]);
          
          // 배지 포인트 보상
          setUserPoints(prev => prev + 100);
          
          return { ...badge, unlocked: true };
        }
        return badge;
      });
      
      setBadges(updatedBadges);
    }
  }, [badges, setBadges, setNotifications, setUserPoints]);
  // 몬스터 포획 처리 함수
  const captureMonster = useCallback((id) => {
    // 몬스터 업데이트
    const updatedMonsters = monsters.map(monster => 
      monster.id === id ? { ...monster, captured: true } : monster
    );
    setMonsters(updatedMonsters);
    
    // 포인트 추가
    const capturedMonster = monsters.find(m => m.id === id);
    if (capturedMonster) {
      setUserPoints(prevPoints => prevPoints + capturedMonster.points);
      
      // 알림 추가
      const newNotification = {
        id: Date.now(),
        time: '방금',
        message: `축하합니다! ${capturedMonster.name}을(를) 포획하고 ${capturedMonster.points} 포인트를 획득했습니다!`,
        urgent: false,
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
      
      // 플라스틱 배지 업데이트
      if (capturedMonster.type === '플라스틱') {
        const updatedBadges = badges.map(badge => 
          badge.id === 1 ? { ...badge, progress: badge.progress + 1 } : badge
        );
        setBadges(updatedBadges);
      }
      
      // 미션 업데이트
      if (capturedMonster.type === '플라스틱') {
        const plasticMission = missions.find(m => m.id === 1);
        
        if (plasticMission && !plasticMission.completed) {
          const updatedMissions = missions.map(mission => {
            if (mission.id === 1) {
              const newProgress = mission.progress + 1;
              const completed = newProgress >= mission.total;
              
              // 미션 완료시 보상 지급
              if (completed && !mission.completed) {
                setUserPoints(prev => prev + mission.reward);
                
                // 미션 완료 알림
                const missionCompleteNotification = {
                  id: Date.now() + 1,
                  time: '방금',
                  message: `미션 완료: ${mission.title}! ${mission.reward} 포인트를 획득했습니다.`,
                  urgent: false,
                  read: false
                };
                setNotifications(prev => [missionCompleteNotification, ...prev]);
              }
              
              return { 
                ...mission, 
                progress: newProgress,
                completed: completed
              };
            }
            return mission;
          });
          
          setMissions(updatedMissions);
        }
      }
    }
    
    // 카메라 모드 종료
    setTimeout(() => {
      setCameraActive(false);
    }, 1500);
  }, [monsters, missions, badges, setMonsters, setUserPoints, setNotifications, setBadges, setMissions, setCameraActive]);
  
  // 몬스터가 주변에 있는지 확인
  const isMonsterNearby = useCallback((monsterLat, monsterLng) => {
    if (!userLocation) return false;
    
    // 50미터 이내면 근처로 간주 (0.05km)
    const distance = calculateDistance(
      userLocation.lat, userLocation.lng, monsterLat, monsterLng
    );
    
    return distance <= 0.05;
  }, [userLocation]);

  // 읽지 않은 알림 수
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(notif => !notif.read).length;
  }, [notifications]);

  // 알림 읽음 처리
  const markNotificationAsRead = (id) => {
    const updatedNotifications = notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    );
    setNotifications(updatedNotifications);
  };

  // 모든 알림 읽음 처리
  const markAllNotificationsAsRead = () => {
    const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
    setNotifications(updatedNotifications);
  };

  // 지역 환경 점수 계산
  const calculateEnvironmentScore = useMemo(() => {
    const hotspotSeverity = hotspots.reduce((total, spot) => {
      if (spot.level === 'high') return total + 3;
      if (spot.level === 'medium') return total + 2;
      return total + 1;
    }, 0);
    
    const capturedMonsters = monsters.filter(m => m.captured).length;
    const totalMonsters = monsters.length;
    const captureRate = totalMonsters > 0 ? (capturedMonsters / totalMonsters) : 0;
    
    // 0-100 점수 계산
    return Math.round(
      (100 - (hotspotSeverity * 5)) * 0.6 + // 핫스팟 (낮을수록 좋음)
      (captureRate * 100) * 0.4 // 몬스터 포획률 (높을수록 좋음)
    );
  }, [hotspots, monsters]);

  // 무단투기 신고 함수
  const reportIllegalDumping = (location, description) => {
    // 새로운 핫스팟 추가 또는 기존 핫스팟 업데이트
    const existingHotspot = hotspots.find(
      spot => calculateDistance(spot.lat, spot.lng, location.lat, location.lng) < 0.1
    );
    
    if (existingHotspot) {
      // 기존 핫스팟 업데이트
      const updatedHotspots = hotspots.map(spot => {
        if (spot.id === existingHotspot.id) {
          const newReportCount = spot.reportCount + 1;
          // 신고 수에 따라 위험도 업데이트
          let newLevel = spot.level;
          if (newReportCount > 10) newLevel = 'high';
          else if (newReportCount > 5) newLevel = 'medium';
          else newLevel = 'low';
          
          return {
            ...spot,
            lastReport: '방금',
            reportCount: newReportCount,
            level: newLevel
          };
        }
        return spot;
      });
      
      setHotspots(updatedHotspots);
    } else {
      // 새 핫스팟 추가
      const newHotspot = {
        id: Date.now(),
        name: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} 부근`,
        level: 'low',
        lastReport: '방금',
        lat: location.lat,
        lng: location.lng,
        reportCount: 1
      };
      
      setHotspots([...hotspots, newHotspot]);
    }
    
    // 무단투기 신고 미션 업데이트
    const reportMission = missions.find(m => m.id === 2);
    if (reportMission && !reportMission.completed) {
      const updatedMissions = missions.map(mission => {
        if (mission.id === 2) {
          const newProgress = mission.progress + 1;
          const completed = newProgress >= mission.total;
          
          // 미션 완료시 보상 지급
          if (completed && !mission.completed) {
            setUserPoints(prev => prev + mission.reward);
            
            // 미션 완료 알림
            const missionCompleteNotification = {
              id: Date.now(),
              time: '방금',
              message: `미션 완료: ${mission.title}! ${mission.reward} 포인트를 획득했습니다.`,
              urgent: false,
              read: false
            };
            setNotifications(prev => [missionCompleteNotification, ...prev]);
          }
          
          return { 
            ...mission, 
            progress: newProgress,
            completed: completed
          };
        }
        return mission;
      });
      
      setMissions(updatedMissions);
    }
    
    // 환경 지킴이 배지 업데이트
    const updatedBadges = badges.map(badge => 
      badge.id === 2 ? { ...badge, progress: badge.progress + 1 } : badge
    );
    setBadges(updatedBadges);
    
    // 신고 포인트 보상
    setUserPoints(prev => prev + 50);
    
    // 신고 완료 알림
    const reportNotification = {
      id: Date.now() + 1,
      time: '방금',
      message: `무단투기 신고 완료! 50 포인트를 획득했습니다.`,
      urgent: false,
      read: false
    };
    setNotifications(prev => [reportNotification, ...prev]);
    
    return true;
  };

  // 이벤트 참여 함수
  const joinEvent = (eventId) => {
    // 포인트 보상 (실제로는 이벤트 참여 후 지급)
    const event = events.find(e => e.id === eventId);
    if (event) {
      // 참가자 수 증가
      const updatedEvents = events.map(e => 
        e.id === eventId ? { ...e, participants: e.participants + 1 } : e
      );
      setEvents(updatedEvents);
      
      // 참여 알림
      const joinNotification = {
        id: Date.now(),
        time: '방금',
        message: `${event.title} 이벤트 참여가 완료되었습니다. 이벤트 당일에 참석하시면 ${event.reward} 포인트를 획득하실 수 있습니다.`,
        urgent: false,
        read: false
      };
      setNotifications(prev => [joinNotification, ...prev]);
      
      // 커뮤니티 미션 업데이트
      const communityMission = missions.find(m => m.id === 4);
      if (communityMission && !communityMission.completed) {
        const updatedMissions = missions.map(mission => {
          if (mission.id === 4) {
            const newProgress = mission.progress + 1;
            const completed = newProgress >= mission.total;
            
            // 미션 완료시 보상 지급
            if (completed && !mission.completed) {
              setUserPoints(prev => prev + mission.reward);
              
              // 미션 완료 알림
              const missionCompleteNotification = {
                id: Date.now() + 1,
                time: '방금',
                message: `미션 완료: ${mission.title}! ${mission.reward} 포인트를 획득했습니다.`,
                urgent: false,
                read: false
              };
              setNotifications(prev => [missionCompleteNotification, ...prev]);
            }
            
            return { 
              ...mission, 
              progress: newProgress,
              completed: completed
            };
          }
          return mission;
        });
        
        setMissions(updatedMissions);
      }
      
      // 커뮤니티 스타 배지 업데이트
      const updatedBadges = badges.map(badge => 
        badge.id === 4 ? { ...badge, progress: badge.progress + 1 } : badge
      );
      setBadges(updatedBadges);
    }
  };

  // 테마 전환 함수
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // 알림 토글 함수
  const toggleNotifications = () => {
    setIsNotificationsEnabled(!isNotificationsEnabled);
  };

  // 친구 초대 함수
  const inviteFriend = (email) => {
    // 실제로는 API를 통해 초대 이메일 발송
    // 미션 업데이트
    const inviteMission = missions.find(m => m.id === 3);
    if (inviteMission && !inviteMission.completed) {
      const updatedMissions = missions.map(mission => {
        if (mission.id === 3) {
          const newProgress = mission.progress + 1;
          const completed = newProgress >= mission.total;
          
          // 미션 완료시 보상 지급
          if (completed && !mission.completed) {
            setUserPoints(prev => prev + mission.reward);
            
            const completionNotification = {
              id: Date.now(),
              time: '방금',
              message: `미션 완료: ${mission.title}! ${mission.reward} 포인트를 획득했습니다.`,
              urgent: false,
              read: false
            };
            setNotifications(prev => [completionNotification, ...prev]);
          }
          
          return { 
            ...mission, 
            progress: newProgress,
            completed: completed
          };
        }
        return mission;
      });
      
      setMissions(updatedMissions);
    }
    
    // 초대 완료 알림
    const inviteNotification = {
      id: Date.now(),
      time: '방금',
      message: `친구 초대가 완료되었습니다. 친구가 가입하면 100 포인트를 추가로 받습니다!`,
      urgent: false,
      read: false
    };
    setNotifications(prev => [inviteNotification, ...prev]);
    
    return true;
  };
  
  // 콘텐츠 화면 전환
  const renderContent = () => {
    if (cameraActive) {
      return <CameraScreen />;
    }
    
    // 첫 사용자를 위한 튜토리얼 표시
    if (showTutorial) {
      return <TutorialScreen onComplete={() => setShowTutorial(false)} />;
    }
    
    // 로그인 프롬프트 표시
    if (showLoginPrompt) {
      return <LoginScreen onLogin={() => {
        setIsUserLoggedIn(true);
        setShowLoginPrompt(false);
      }} onCancel={() => setShowLoginPrompt(false)} />;
    }
    
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'quest':
        return <QuestScreen />;
      case 'map':
        return <MapScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'community':
        return <CommunityScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };
  
  // 홈 화면 컴포넌트
  const HomeScreen = () => (
    <div className={`flex flex-col space-y-4 p-4 pb-16 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      {/* 사용자 프로필 카드 */}
      <div className="bg-gradient-to-r from-green-600 to-blue-500 rounded-lg p-4 text-white shadow-lg">
        <h2 className="text-xl font-bold mb-2">안녕하세요, 에코 히어로님!</h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90">현재 포인트</p>
            <p className="text-2xl font-bold">{userPoints} 포인트</p>
          </div>
          <div>
            <div className="flex flex-col items-center">
              <p className="text-sm opacity-90">레벨</p>
              <p className="text-xl">{level}</p>
            </div>
          </div>
          <div>
            <p className="text-sm opacity-90">랭킹</p>
            <p className="text-xl">{rank}위 / 156명</p>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs opacity-90">다음 레벨까지</p>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-2 mt-1">
            <div 
              className="bg-white h-2 rounded-full" 
              style={{ width: `${(userPoints % 100) / 100 * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* 환경 점수 카드 */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
        <h3 className="font-bold text-lg border-b pb-2 mb-2 flex items-center">
          <Leaf size={18} className="mr-2 text-green-500" />
          정릉3동 환경 상태
        </h3>
        <div className="flex justify-center my-2">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#eee"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={calculateEnvironmentScore > 75 ? "#48bb78" : calculateEnvironmentScore > 50 ? "#ecc94b" : "#f56565"}
                strokeWidth="2"
                strokeDasharray={`${calculateEnvironmentScore}, 100`}
                strokeLinecap="round"
              />
              <text x="18" y="20.5" className="text-3xl" textAnchor="middle" fill={theme === 'dark' ? 'white' : 'black'}>
                {calculateEnvironmentScore}
              </text>
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium">
            {calculateEnvironmentScore > 75 ? "양호" : calculateEnvironmentScore > 50 ? "보통" : "위험"}
          </p>
          <p className="text-xs text-gray-500 mt-1">최근 24시간 데이터 기준</p>
        </div>
      </div>
      
      {/* 알림 섹션 */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
        <h3 className="font-bold text-lg border-b pb-2 mb-2 flex items-center justify-between">
          <div className="flex items-center">
            <Bell size={18} className="mr-2 text-orange-500" />
            실시간 알림
          </div>
          {unreadNotificationsCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadNotificationsCount}
            </span>
          )}
        </h3>
        <div className="space-y-2">
          {notifications.slice(0, 3).map(notif => (
            <div 
              key={notif.id} 
              className={`p-2 rounded-md ${
                notif.urgent 
                  ? 'bg-red-50 border-l-4 border-red-500' 
                  : notif.read 
                    ? (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50') 
                    : (theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50')
              }`}
              onClick={() => markNotificationAsRead(notif.id)}
            >
              <p className={`text-sm ${notif.urgent || !notif.read ? 'font-bold' : ''}`}>{notif.message}</p>
              <p className="text-xs text-gray-500">{notif.time}</p>
            </div>
          ))}
        </div>
        <button 
          className="mt-3 w-full py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium rounded-md transition-colors"
          onClick={() => {
            markAllNotificationsAsRead();
            // 알림 전체 보기 모달이나 페이지로 이동하도록 구현 가능
          }}
        >
          {unreadNotificationsCount > 0 ? `${unreadNotificationsCount}개의 알림 모두 보기` : "모든 알림 보기"}
        </button>
      </div>
      
      {/* 핫스팟 섹션 */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
        <h3 className="font-bold text-lg border-b pb-2 mb-2 flex items-center">
          <Trash size={18} className="mr-2 text-red-500" />
          무단투기 핫스팟
        </h3>
        <div className="space-y-2">
          {hotspots.slice(0, 3).map(spot => (
            <div key={spot.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
              <div>
                <p className="font-medium">{spot.name}</p>
                <p className="text-xs text-gray-500">마지막 신고: {spot.lastReport}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                spot.level === 'high' ? 'bg-red-100 text-red-800' : 
                spot.level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {spot.level === 'high' ? '위험' : spot.level === 'medium' ? '주의' : '양호'}
              </div>
            </div>
          ))}
        </div>
        <div className="flex space-x-2 mt-3">
          <button 
            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors"
            onClick={() => setActiveTab('map')}
          >
            지도에서 보기
          </button>
          <button 
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors"
            onClick={() => {
              // 무단투기 신고 모달 또는 화면으로 이동
              // 간단한 구현을 위해 현재 위치에서 신고하는 것으로 처리
              if (userLocation) {
                reportIllegalDumping(userLocation, "사용자 신고");
              }
            }}
          >
            무단투기 신고
          </button>
        </div>
      </div>
      
      {/* 오늘의 미션 */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
        <h3 className="font-bold text-lg border-b pb-2 mb-2 flex items-center">
          <Award size={18} className="mr-2 text-purple-500" />
          오늘의 미션
        </h3>
        <div className="space-y-2">
          {missions.filter(m => m.type === 'daily' && !m.completed).slice(0, 2).map(mission => (
            <div key={mission.id} className="p-2 bg-purple-50 rounded-md">
              <p className="font-medium">{mission.title}</p>
              <div className="flex items-center mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm text-gray-600">{mission.progress}/{mission.total}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">보상: {mission.reward} 포인트</p>
            </div>
          ))}
        </div>
        <button 
          className="mt-3 w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-md transition-colors"
          onClick={() => setActiveTab('quest')}
        >
          퀘스트 시작하기
        </button>
      </div>
      
      {/* 주변 몬스터 요약 */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
        <h3 className="font-bold text-lg border-b pb-2 mb-2 flex items-center">
          <ShieldAlert size={18} className="mr-2 text-blue-500" />
          주변 쓰레기 몬스터
        </h3>
        <div className="flex justify-around my-2">
          {monsters.filter(m => !m.captured).slice(0, 3).map(monster => (
            <div key={monster.id} className="flex flex-col items-center">
              <div className="text-3xl mb-1">{monster.image}</div>
              <p className="text-xs font-medium">{monster.name}</p>
              <p className="text-xs text-gray-500">{monster.location}</p>
            </div>
          ))}
        </div>
        <button 
          className="mt-3 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors flex justify-center items-center"
          onClick={() => setCameraActive(true)}
        >
          <Camera className="mr-2" size={16} />
          몬스터 포획하기
        </button>
      </div>
    </div>
  );
  
  // 카메라 화면 컴포넌트
  const CameraScreen = () => {
    const videoRef = useRef(null);
    const [currentMonster, setCurrentMonster] = useState(null);
    const [flashMessage, setFlashMessage] = useState("");
    const [showFlash, setShowFlash] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    
    // 카메라 초기화
    useEffect(() => {
      let stream = null;
      
      async function setupCamera() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          
          // 카메라가 성공적으로 설정되면 주변 몬스터 검사
          const nearbyMonsters = monsters.filter(m => !m.captured && isMonsterNearby(m.lat, m.lng));
          
          if (nearbyMonsters.length > 0) {
            // 랜덤하게 몬스터 선택
            const randomMonster = nearbyMonsters[Math.floor(Math.random() * nearbyMonsters.length)];
            setCurrentMonster(randomMonster);
          } else {
            showFlashMessage('주변에 몬스터가 없습니다. 다른 장소로 이동해보세요.');
            setTimeout(() => setCameraActive(false), 3000);
          }
          
        } catch (err) {
          console.error('카메라 접근 오류:', err);
          setCameraError(true);
          showFlashMessage('카메라 접근에 실패했습니다');
          setTimeout(() => setCameraActive(false), 2000);
        }
      }
      
      setupCamera();
      
      // 컴포넌트 언마운트 시 카메라 정리
      return () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }, []);
    
    // 플래시 메시지 표시
    const showFlashMessage = (message) => {
      setFlashMessage(message);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 3000);
    };
    
    // 몬스터 포획 이벤트
    const handleCapture = () => {
      if (currentMonster) {
        showFlashMessage(`${currentMonster.name}을(를) 포획했습니다!`);
        captureMonster(currentMonster.id);
      } else {
        showFlashMessage('주변에 몬스터가 없습니다');
        setTimeout(() => setCameraActive(false), 1500);
      }
    };
    
    // 카메라 오류 화면
    if (cameraError) {
      return (
        <div className="flex flex-col h-full items-center justify-center p-4 bg-black text-white">
          <Camera size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">카메라 접근 오류</h2>
          <p className="text-center mb-4">카메라에 접근할 수 없습니다. 권한을 확인해주세요.</p>
          <button 
            onClick={() => setCameraActive(false)}
            className="px-4 py-2 bg-white text-black font-medium rounded-md"
          >
            돌아가기
          </button>
        </div>
      );
    }
    
    return (
      <div className="relative h-full w-full">
        {/* 카메라 비디오 */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
        />
        
        {/* AR 몬스터 */}
        {currentMonster && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl animate-bounce">
            {currentMonster.image}
          </div>
        )}
        
        {/* 위쪽 툴바 */}
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 flex justify-between items-center">
          <button 
            onClick={() => setCameraActive(false)}
            className="p-2"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-bold">AR 몬스터 포획</h2>
          <div className="w-8"></div> {/* 오른쪽 여백 */}
        </div>
        
        {/* 하단 포획 버튼 */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button 
            onClick={handleCapture}
            className="bg-purple-600 text-white p-4 rounded-full shadow-lg"
          >
            <Camera size={32} />
          </button>
        </div>
        
        {/* 몬스터 정보 */}
        {currentMonster && (
          <div className="absolute bottom-24 left-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-3">{currentMonster.image}</div>
              <div>
                <div className="flex items-center">
                  <h3 className="font-bold">{currentMonster.name}</h3>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    currentMonster.rarity === 'rare' ? 'bg-purple-100 text-purple-800' :
                    currentMonster.rarity === 'uncommon' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {currentMonster.rarity === 'rare' ? '희귀' : 
                     currentMonster.rarity === 'uncommon' ? '중간' : '일반'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">타입: {currentMonster.type} | 포인트: {currentMonster.points}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 플래시 메시지 */}
        {showFlash && (
          <div className="absolute top-1/4 left-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg text-center">
            {flashMessage}
          </div>
        )}
      </div>
    );
  };
  
  // AR 퀘스트 화면 (몬스터 포획)
  const QuestScreen = () => {
    const [activeQuestTab, setActiveQuestTab] = useState('monsters');
    
    return (
      <div className={`flex flex-col h-full pb-16 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
        <div className="p-4 bg-purple-100">
          <h2 className="text-xl font-bold text-purple-800">에코 퀘스트</h2>
          <p className="text-sm text-purple-600">환경을 보호하며 포인트를 모으세요!</p>
        </div>
        
        {/* 퀘스트 탭 */}
        <div className="flex border-b mb-2 bg-white">
          <button 
            className={`py-3 px-4 font-medium flex-1 ${activeQuestTab === 'monsters' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
            onClick={() => setActiveQuestTab('monsters')}
          >
            몬스터 포획
          </button>
          <button 
            className={`py-3 px-4 font-medium flex-1 ${activeQuestTab === 'missions' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
            onClick={() => setActiveQuestTab('missions')}
          >
            미션
          </button>
          <button 
            className={`py-3 px-4 font-medium flex-1 ${activeQuestTab === 'badges' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
            onClick={() => setActiveQuestTab('badges')}
          >
            배지
          </button>
        </div>
        
        {/* 몬스터 포획 탭 */}
        {activeQuestTab === 'monsters' && (
          <div className="p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow mb-4`}>
              <h3 className="font-bold mb-2">몬스터 포획 현황</h3>
              <div className="flex items-center mb-2">
                <div className="w-full bg-gray-200 rounded-full h-3 mr-2">
                  <div className="bg-purple-500 h-3 rounded-full" style={{ 
                    width: `${(monsters.filter(m => m.captured).length / monsters.length) * 100}%` 
                  }}></div>
                </div>
                <span className="text-sm font-medium">{monsters.filter(m => m.captured).length}/{monsters.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="text-center">
                  <div className="text-sm font-medium">플라스틱</div>
                  <div className="text-lg font-bold text-blue-500">{monsters.filter(m => m.type === '플라스틱' && m.captured).length}/{monsters.filter(m => m.type === '플라스틱').length}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">종이</div>
                  <div className="text-lg font-bold text-green-500">{monsters.filter(m => m.type === '종이' && m.captured).length}/{monsters.filter(m => m.type === '종이').length}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">금속</div>
                  <div className="text-lg font-bold text-yellow-500">{monsters.filter(m => m.type === '금속' && m.captured).length}/{monsters.filter(m => m.type === '금속').length}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">유리</div>
                  <div className="text-lg font-bold text-purple-500">{monsters.filter(m => m.type === '유리' && m.captured).length}/{monsters.filter(m => m.type === '유리').length}</div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setCameraActive(true)}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 rounded-lg shadow-md flex justify-center items-center mb-6 transition-colors"
            >
              <Camera className="mr-2" size={20} />
              AR 카메라 켜기
            </button>
            
            <h3 className="font-bold mb-3">주변 쓰레기 몬스터</h3>
            <div className="space-y-3">
              {monsters.map(monster => (
                <div 
                  key={monster.id} 
                  className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow flex justify-between items-center ${monster.captured ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center">
                    <div className="text-3xl mr-3">{monster.image}</div>
                    <div>
                      <div className="flex items-center">
                        <h4 className="font-bold">{monster.name}</h4>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          monster.rarity === 'rare' ? 'bg-purple-100 text-purple-800' :
                          monster.rarity === 'uncommon' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {monster.rarity === 'rare' ? '희귀' : 
                           monster.rarity === 'uncommon' ? '중간' : '일반'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        타입: {monster.type} | 위치: {monster.location} | 포인트: {monster.points}
                      </p>
                    </div>
                  </div>
                  {monster.captured ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">포획완료</span>
                  ) : (
                    <button 
                      onClick={() => {
                        if (isMonsterNearby(monster.lat, monster.lng)) {
                          setCameraActive(true);
                        } else {
                          alert('이 몬스터는 현재 위치에서 너무 멀리 있습니다. 더 가까이 가서 시도해보세요.');
                        }
                      }}
                      className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded transition-colors"
                    >
                      포획하기
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 미션 탭 */}
        {activeQuestTab === 'missions' && (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="font-bold mb-3">일일 미션</h3>
              <div className="space-y-3">
                {missions.filter(m => m.type === 'daily').map(mission => (
                  <div 
                    key={mission.id} 
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow ${mission.completed ? 'border-l-4 border-green-500' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold">{mission.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        mission.completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {mission.completed ? '완료' : '진행중'}
                      </span>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${mission.completed ? 'bg-green-500' : 'bg-blue-500'}`} 
                          style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm">{mission.progress}/{mission.total}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-gray-500">보상: {mission.reward} 포인트</span>
                      {!mission.completed && (
                        <button 
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                          onClick={() => {
                            // 미션에 따른 액션 (예: 카메라 켜기, 지도 보기 등)
                            if (mission.id === 1) setCameraActive(true);
                            else if (mission.id === 2) setActiveTab('map');
                          }}
                        >
                          바로가기
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-3">주간 미션</h3>
              <div className="space-y-3">
                {missions.filter(m => m.type === 'weekly').map(mission => (
                  <div 
                    key={mission.id} 
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow ${mission.completed ? 'border-l-4 border-green-500' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold">{mission.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        mission.completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {mission.completed ? '완료' : '주간'}
                      </span>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${mission.completed ? 'bg-green-500' : 'bg-purple-500'}`} 
                          style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm">{mission.progress}/{mission.total}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-gray-500">보상: {mission.reward} 포인트</span>
                      {!mission.completed && (
                        <button 
                          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded transition-colors"
                          onClick={() => {
                            // 미션에 따른 액션
                            if (mission.id === 3) {
                              // 친구 초대 모달 표시
                              inviteFriend("example@example.com");
                            } 
                            else if (mission.id === 4) setActiveTab('community');
                          }}
                        >
                          바로가기
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* 배지 탭 */}
        {activeQuestTab === 'badges' && (
          <div className="p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow mb-4`}>
              <h3 className="font-bold mb-3">배지 컬렉션</h3>
              <p className="text-sm text-gray-500 mb-3">특별한 도전과제를 완료하여 배지를 수집하세요!</p>
              <div className="grid grid-cols-2 gap-3">
                {badges.map(badge => (
                  <div 
                    key={badge.id} 
                    className={`p-3 rounded-lg border ${badge.unlocked 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-gray-300 bg-gray-50'}`}
                  >
                    <div className="flex items-center">
                      <div className="text-3xl mr-2">{badge.image}</div>
                      <div>
                        <h4 className="font-bold text-sm">{badge.name}</h4>
                        <p className="text-xs text-gray-500">{badge.description}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>진행도</span>
                        <span>{badge.progress}/{badge.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${badge.unlocked ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min((badge.progress / badge.total) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow`}>
              <h3 className="font-bold mb-2">내 레벨</h3>
              <div className="flex items-center">
                <div className="text-4xl font-bold mr-3">{level}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>다음 레벨까지</span>
                    <span>{userPoints % 100}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(userPoints % 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">레벨 {level + 1}에 도달하면 배지 진행도와 100 포인트를 받습니다.</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // 지도 화면 컴포넌트
  const MapScreen = () => {
    const mapRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [mapMode, setMapMode] = useState('hotspots'); // 'hotspots' or 'monsters'
    const [selectedHotspot, setSelectedHotspot] = useState(null);
    
    // 카카오맵 초기화
    useEffect(() => {
      if (mapRef.current && userLocation && window.kakao && window.kakao.maps) {
        try {
          // 카카오 맵 초기화
          const options = {
            center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
            level: 3
          };
          
          const map = new window.kakao.maps.Map(mapRef.current, options);
          setMapInstance(map);
          
          // 현재 위치 마커
          const userMarker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
            map: map
          });
          
          // 현재 위치 인포윈도우
          const userInfo = new window.kakao.maps.InfoWindow({
            content: '<div class="p-2 text-center">현재 위치</div>'
          });
          userInfo.open(map, userMarker);
          
          renderMapMarkers(map, mapMode);
        } catch (error) {
          console.error("카카오맵 초기화 오류:", error);
        }
      }
    }, [mapMode, userLocation]); // 의존성 배열에 필요한 값만 유지

    // 지도 마커 렌더링 함수
    const renderMapMarkers = (map, mode) => {
      // 기존 마커 제거 로직이 필요할 수 있음
      
      if (mode === 'hotspots') {
        // 핫스팟 마커 추가
        hotspots.forEach(spot => {
          const marker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(spot.lat, spot.lng),
            map: map
          });
          
          // 마커 스타일 설정
          let markerImage;
          if (spot.level === 'high') {
            markerImage = new window.kakao.maps.MarkerImage(
              'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
              new window.kakao.maps.Size(24, 35)
            );
            marker.setImage(markerImage);
          }
          
          // 인포윈도우 추가
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `
              <div class="p-2">
                <div class="font-bold">${spot.name}</div>
                <div class="text-xs">마지막 신고: ${spot.lastReport}</div>
                <div class="text-xs">신고 횟수: ${spot.reportCount}회</div>
              </div>
            `,
            removable: true
          });
          
          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map, marker);
            setSelectedHotspot(spot);
          });
        });
      } else if (mode === 'monsters') {
        // 몬스터 마커 추가
        monsters.forEach(monster => {
          if (!monster.captured) {
            const monsterMarker = new window.kakao.maps.Marker({
              position: new window.kakao.maps.LatLng(monster.lat, monster.lng),
              map: map
            });
            
            // 몬스터 인포윈도우
            const monsterInfo = new window.kakao.maps.InfoWindow({
              content: `
                <div class="p-2">
                  <div class="font-bold">${monster.name} ${monster.image}</div>
                  <div class="text-xs">타입: ${monster.type} | 포인트: ${monster.points}</div>
                  <div class="text-xs">희귀도: ${
                    monster.rarity === 'rare' ? '희귀' : 
                    monster.rarity === 'uncommon' ? '중간' : '일반'
                  }</div>
                </div>
              `,
              removable: true
            });
            
            // 마커 클릭 이벤트
            window.kakao.maps.event.addListener(monsterMarker, 'click', function() {
              monsterInfo.open(map, monsterMarker);
            });
          }
        });
      }
    };
    
    return (
      <div className={`flex flex-col h-full pb-16 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
        <div className="p-4 bg-blue-100">
          <h2 className="text-xl font-bold text-blue-800">환경 지도</h2>
          <p className="text-sm text-blue-600">무단투기 핫스팟과 몬스터 출현 지역을 확인하세요</p>
        </div>
        
        {/* 지도 모드 전환 탭 */}
        <div className="bg-white flex">
          <button
            className={`flex-1 py-3 font-medium ${mapMode === 'hotspots' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500'}`}
            onClick={() => setMapMode('hotspots')}
          >
            무단투기 핫스팟
          </button>
          <button
            className={`flex-1 py-3 font-medium ${mapMode === 'monsters' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setMapMode('monsters')}
          >
            몬스터 출현
          </button>
        </div>
        
        <div className="relative flex-1">
          {window.kakao && window.kakao.maps ? (
            <div ref={mapRef} className="w-full h-full"></div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-50">
              <div className="text-center">
                <Map size={48} className="mx-auto mb-3 text-blue-500" />
                <p className="text-gray-600">지도를 불러오는 중...</p>
              </div>
            </div>
          )}
                    
          {/* 범례 */}
          <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-lg shadow-md">
            {mapMode === 'hotspots' ? (
              <>
                <h3 className="font-bold mb-2">핫스팟 범례</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-xs">위험 (10회 이상)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-xs">주의 (5-9회)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs">양호 (1-4회)</span>
                  </div>
                </div>
                {selectedHotspot && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{selectedHotspot.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedHotspot.level === 'high' ? 'bg-red-100 text-red-800' : 
                        selectedHotspot.level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedHotspot.level === 'high' ? '위험' : selectedHotspot.level === 'medium' ? '주의' : '양호'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">신고 횟수: {selectedHotspot.reportCount}회</p>
                    <button 
                      className="mt-2 w-full py-1.5 bg-red-500 text-white text-xs font-medium rounded-md"
                      onClick={() => reportIllegalDumping(selectedHotspot, "추가 신고")}
                    >
                      무단투기 신고
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="font-bold mb-2">몬스터 범례</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-xs">희귀 몬스터</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-xs">중간 몬스터</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs">일반 몬스터</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  몬스터를 포획하려면 실제로 해당 위치에 가까이 가야 합니다.
                </div>
                <button 
                  className="mt-2 w-full py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md"
                  onClick={() => setCameraActive(true)}
                >
                  AR 카메라 켜기
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // 통계 화면 컴포넌트
  const StatsScreen = () => {
    const [statsTimeFrame, setStatsTimeFrame] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
    
    return (
      <div className={`flex flex-col h-full p-4 pb-16 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
        <h2 className="text-xl font-bold mb-2">환경 통계</h2>
        
        {/* 시간 프레임 선택 */}
        <div className="flex mb-4 bg-white rounded-lg shadow overflow-hidden">
          <button 
            className={`flex-1 py-2 ${statsTimeFrame === 'weekly' ? 'bg-green-500 text-white' : 'text-gray-500'}`}
            onClick={() => setStatsTimeFrame('weekly')}
          >
            주간
          </button>
          <button 
            className={`flex-1 py-2 ${statsTimeFrame === 'monthly' ? 'bg-green-500 text-white' : 'text-gray-500'}`}
            onClick={() => setStatsTimeFrame('monthly')}
          >
            월간
          </button>
          <button 
            className={`flex-1 py-2 ${statsTimeFrame === 'yearly' ? 'bg-green-500 text-white' : 'text-gray-500'}`}
            onClick={() => setStatsTimeFrame('yearly')}
          >
            연간
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow text-center`}>
            <p className="text-xs text-gray-500">포인트 획득</p>
            <p className="text-2xl font-bold text-purple-600">{userPoints}</p>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow text-center`}>
            <p className="text-xs text-gray-500">포획한 몬스터</p>
            <p className="text-2xl font-bold text-green-600">{monsters.filter(m => m.captured).length}</p>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow text-center`}>
            <p className="text-xs text-gray-500">참여한 이벤트</p>
            <p className="text-2xl font-bold text-blue-600">3</p>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg shadow text-center`}>
            <p className="text-xs text-gray-500">신고한 무단투기</p>
            <p className="text-2xl font-bold text-red-600">7</p>
          </div>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-4`}>
          <h3 className="font-bold mb-3">활동 통계</h3>
          <div className="h-48 relative">
            {/* 차트 구현 - 실제로는 Recharts 등의 라이브러리 사용 */}
            <div className="absolute inset-0 flex items-end justify-between p-2">
              {stats.weeklyActivity.map((day, i) => (
                <div key={day.day} className="flex flex-col items-center">
                  <div 
                    className="w-8 bg-blue-500 rounded-t transition-all duration-500 ease-in-out" 
                    style={{ height: `${(day.points / Math.max(...stats.weeklyActivity.map(d => d.points))) * 100}%` }}
                  ></div>
                  <p className="text-xs mt-1">{day.day}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-4`}>
          <h3 className="font-bold mb-3">포획한 몬스터 유형</h3>
          <div className="flex justify-around">
            <div className="text-center">
              <div className="text-xl mb-1">🧪</div>
              <p className="font-bold">{stats.monsterCaptureStats.plastic}</p>
              <p className="text-xs text-gray-500">플라스틱</p>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">📄</div>
              <p className="font-bold">{stats.monsterCaptureStats.paper}</p>
              <p className="text-xs text-gray-500">종이</p>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">🥫</div>
              <p className="font-bold">{stats.monsterCaptureStats.metal}</p>
              <p className="text-xs text-gray-500">금속</p>
            </div>
            <div className="text-center">
              <div className="text-xl mb-1">🧙‍♂️</div>
              <p className="font-bold">{stats.monsterCaptureStats.glass}</p>
              <p className="text-xs text-gray-500">유리</p>
            </div>
          </div>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
          <h3 className="font-bold mb-3">정릉3동 환경 개선도</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm">무단투기 감소</p>
                <p className="text-sm font-medium">{stats.environmentalImpact.trashReduction}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-in-out" 
                  style={{ width: `${stats.environmentalImpact.trashReduction}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm">재활용률 증가</p>
                <p className="text-sm font-medium">{stats.environmentalImpact.recyclingRate}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-in-out" 
                  style={{ width: `${stats.environmentalImpact.recyclingRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm">주민 참여율</p>
                <p className="text-sm font-medium">{stats.environmentalImpact.participationRate}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-1000 ease-in-out" 
                  style={{ width: `${stats.environmentalImpact.participationRate}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="font-bold mb-2">환경 영향 분석</h4>
            <div className="space-y-2 text-sm">
              <p>• 무단투기 감소로 인한 <span className="font-medium text-green-600">CO₂ 절감량: 약 {stats.environmentalImpact.co2Reduction}kg</span></p>
              <p>• 재활용 증가로 인한 <span className="font-medium text-green-600">자원 절약: 약 {stats.environmentalImpact.resourcesSaved}kg</span></p>
              <p>• 예상 환경 개선 효과: <span className="font-medium text-green-600">연간 1.2톤 CO₂ 감소</span></p>
              <p className="text-xs text-gray-500 mt-2">* 통계 데이터는 사용자 활동과 지역 환경 모니터링을 기반으로 산출됩니다</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 커뮤니티 화면 컴포넌트
  const CommunityScreen = () => {
    const [activeSection, setActiveSection] = useState('events');
    const [messageText, setMessageText] = useState('');
    
    // 채팅 메시지 데이터
    const [chatMessages, setChatMessages] = useState([
      { id: 1, author: '에코히어로123', message: '안녕하세요! 오늘 배밭골 근처에서 몬스터 발견하신 분 계신가요?', time: '30분 전', isMe: false },
      { id: 2, author: '그린워커', message: '저는 오늘 아침에 쓰레기몬 포획했어요! 배밭골 원룸촌 입구 쪽에 있었습니다.', time: '25분 전', isMe: false },
      { id: 3, author: '환경지킴이', message: '이번 주 토요일 벽화 그리기 참여하시는 분들 준비물 확인하세요! 작업복이나 편한 옷 필수입니다~', time: '15분 전', isMe: false },
      { id: 4, author: '나', message: '혹시 페트병 드래곤 출몰 위치 아시는 분? 며칠째 찾고 있는데 못 만났네요 ㅠㅠ', time: '10분 전', isMe: true },
      { id: 5, author: '몬스터헌터', message: '정릉시장 뒷골목에서 자주 보이던데요! 저녁 시간에 한번 가보세요.', time: '5분 전', isMe: false }
    ]);
    
    // 게시판 데이터
    const [boardPosts, setBoardPosts] = useState([
      { 
        id: 1, 
        title: '배밭골 원룸촌 분리수거함 추가 설치 건의', 
        content: '원룸촌에 분리수거함이 부족해서 무단투기가 많이 발생하는 것 같습니다. 추가 설치가 필요해 보입니다.',
        author: '에코지킴이',
        time: '1시간 전',
        comments: 7,
        likes: 12,
        category: '환경시설'
      },
      {
        id: 2,
        title: '정릉시장 에코백 사용 캠페인 제안',
        content: '정릉시장에서 장 볼 때 비닐봉지 대신 에코백 사용을 장려하는 캠페인을 해보면 어떨까요?',
        author: '그린워커',
        time: '어제',
        comments: 3,
        likes: 8,
        category: '제안'
      },
      {
        id: 3,
        title: '지난 주 벽화 그리기 활동 사진 공유',
        content: '지난 주 진행한 벽화 그리기 활동 사진을 공유합니다. 많은 분들이 참여해주셔서 감사합니다!',
        author: '환경지킴이',
        time: '3일 전',
        comments: 15,
        likes: 26,
        category: '활동공유'
      },
      {
        id: 4,
        title: '대학가 카페 일회용컵 줄이기 방안',
        content: '대학가 카페에서 텀블러 사용 시 추가 할인이나 포인트 적립 제도를 확대하면 좋을 것 같아요.',
        author: '커피러버',
        time: '5일 전',
        comments: 9,
        likes: 14,
        category: '제안'
      }
    ]);
    
    // 메시지 전송 처리
    const handleSendMessage = () => {
      if (messageText.trim() === '') return;
      
      const newMessage = {
        id: Date.now(),
        author: '나',
        message: messageText,
        time: '방금',
        isMe: true
      };
      
      setChatMessages([...chatMessages, newMessage]);
      setMessageText('');
    };
    
    // 이벤트 참가 처리
    const handleJoinEvent = (eventId) => {
      joinEvent(eventId);
    };
    
    return (
      <div className={`flex flex-col h-full pb-16 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
        <h2 className="text-xl font-bold p-4">커뮤니티</h2>
        
        {/* 섹션 탭 */}
        <div className="flex border-b mb-4 bg-white">
          <button 
            className={`py-3 px-4 font-medium flex-1 ${activeSection === 'events' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveSection('events')}
          >
            이벤트
          </button>
          <button 
            className={`py-3 px-4 font-medium flex-1 ${activeSection === 'board' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveSection('board')}
          >
            게시판
          </button>
          <button 
            className={`py-3 px-4 font-medium flex-1 ${activeSection === 'chat' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveSection('chat')}
          >
            실시간 채팅
          </button>
        </div>
        
        {/* 이벤트 섹션 */}
        {activeSection === 'events' && (
          <div className="space-y-4 p-4">
            {events.map(event => (
              <div key={event.id} className={`p-4 bg-green-50 rounded-lg shadow ${theme === 'dark' ? 'bg-green-900 text-white' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{event.image}</span>
                      <h3 className="font-bold text-lg">{event.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{new Date(event.date).toLocaleString('ko-KR', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })} - {event.location}</p>
                    <div className="flex items-center mt-2">
                      <User size={14} className="text-gray-500 mr-1" />
                      <span className="text-xs text-gray-500">참가자: {event.participants}명</span>
                    </div>
                  </div>
                  <div className={`${
                    event.category === '환경예술' ? 'bg-green-100 text-green-800' :
                    event.category === '재활용' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  } text-xs font-medium px-2 py-1 rounded`}>
                    {event.category}
                  </div>
                </div>
                <p className="text-sm mt-3">{event.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-gray-500">참가 보상: {event.reward} 포인트</div>
                  <div className="flex space-x-2">
                    <button 
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm rounded-md transition-colors flex items-center"
                      onClick={() => {
                        // 이벤트 공유 기능
                      }}
                    >
                      <Share2 size={14} className="mr-1" />
                      공유
                    </button>
                    <button 
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md transition-colors"
                      onClick={() => handleJoinEvent(event.id)}
                    >
                      참가하기
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 지나간 이벤트 섹션 */}
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow mt-6`}>
              <h3 className="font-bold border-b pb-2 mb-3">지난 이벤트</h3>
              <div className="space-y-2">
                <div className="p-2 border-b flex justify-between items-center">
                  <div>
                    <p className="font-medium">정릉3동 쓰레기 줍기 대회</p>
                    <p className="text-xs text-gray-500">2023년 4월 1일</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">종료됨</span>
                </div>
                <div className="p-2 border-b flex justify-between items-center">
                  <div>
                    <p className="font-medium">봄맞이 폐현수막 리사이클링</p>
                    <p className="text-xs text-gray-500">2023년 3월 15일</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">종료됨</span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <div>
                    <p className="font-medium">우리 동네 새활용 아이디어 공모전</p>
                    <p className="text-xs text-gray-500">2023년 3월 1일</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">종료됨</span>
                </div>
              </div>
              <button className="w-full mt-3 py-2 text-sm text-gray-600 hover:text-gray-800">
                모든 지난 이벤트 보기
              </button>
            </div>
          </div>
        )}
        
        {/* 게시판 섹션 */}
        {activeSection === 'board' && (
          <div className="space-y-4 p-4">
            <div className="flex justify-between mb-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="게시글 검색..." 
                  className={`pl-8 pr-4 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
                />
                <Search size={16} className="absolute left-2 top-2 text-gray-400" />
              </div>
              <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-md transition-colors flex items-center">
                <MessageSquare size={16} className="mr-1" />
                글쓰기
              </button>
            </div>
            
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow divide-y`}>
              {boardPosts.map(post => (
                <div key={post.id} className="p-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{post.title}</h3>
                    <span className="text-xs text-gray-500">{post.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{post.content}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                    <div className="flex items-center">
                      <MessageSquare size={12} className="mr-1" />
                      <span>댓글 {post.comments}</span>
                    </div>
                    <div className="flex items-center">
                      <Leaf size={12} className="mr-1" />
                      <span>공감 {post.likes}</span>
                    </div>
                    <span className={`${
                      post.category === '환경시설' ? 'text-orange-500' :
                      post.category === '제안' ? 'text-green-500' :
                      post.category === '활동공유' ? 'text-blue-500' :
                      'text-gray-500'
                    }`}>{post.category}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 게시판 카테고리 */}
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              <h3 className="font-bold mb-3">게시판 카테고리</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 text-sm bg-orange-100 text-orange-800 rounded-md flex items-center">
                  <ShieldAlert size={14} className="mr-2" />
                  환경시설
                </button>
                <button className="p-2 text-sm bg-green-100 text-green-800 rounded-md flex items-center">
                  <Leaf size={14} className="mr-2" />
                  제안
                </button>
                <button className="p-2 text-sm bg-blue-100 text-blue-800 rounded-md flex items-center">
                  <Camera size={14} className="mr-2" />
                  활동공유
                </button>
                <button className="p-2 text-sm bg-purple-100 text-purple-800 rounded-md flex items-center">
                  <BookOpen size={14} className="mr-2" />
                  환경교육
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 실시간 채팅 섹션 */}
        {activeSection === 'chat' && (
          <div className="flex flex-col h-full p-4">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 flex-1 flex flex-col`}>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {/* 채팅 메시지들 */}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : ''}`}>
                    <div className={`rounded-lg p-2 max-w-xs ${
                      msg.isMe 
                        ? 'bg-blue-100 text-blue-900'
                        : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{msg.isMe ? '나' : msg.author} - {msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 채팅 입력 */}
              <div className="flex">
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="메시지를 입력하세요..." 
                  className={`flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                />
                <button 
                  className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition-colors"
                  onClick={handleSendMessage}
                >
                  전송
                </button>
              </div>
            </div>
            
            {/* 채팅 참여자 */}
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} mt-4 rounded-lg shadow p-3`}>
              <h3 className="font-bold text-sm mb-2">현재 채팅 참여자 (23명)</h3>
              <div className="flex flex-wrap">
                <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded m-1 flex items-center">
                  <User size={12} className="mr-1" />
                  에코히어로123
                </div>
                <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded m-1 flex items-center">
                  <User size={12} className="mr-1" />
                  그린워커
                </div>
                <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded m-1 flex items-center">
                  <User size={12} className="mr-1" />
                  환경지킴이
                </div>
                <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded m-1 flex items-center">
                  <User size={12} className="mr-1" />
                  몬스터헌터
                </div>
                <div className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded m-1">
                  +19명
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // 프로필 화면 컴포넌트
  const ProfileScreen = () => {
    return (
      <div className={`flex flex-col h-full pb-16 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
        <div className="p-4 bg-green-100">
          <h2 className="text-xl font-bold text-green-800">프로필</h2>
          <p className="text-sm text-green-600">계정 설정 및 친구 관리</p>
        </div>
        
        {/* 사용자 프로필 정보 */}
        <div className="p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-4`}>
            <div className="flex items-center">
              <div className="text-4xl mr-3">🦸‍♂️</div>
              <div>
                <h3 className="text-xl font-bold">에코 히어로</h3>
                <p className="text-sm text-gray-500">가입일: 2023년 1월 15일</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm text-gray-500">레벨</p>
                <p className="font-bold">{level}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">포인트</p>
                <p className="font-bold">{userPoints}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">랭킹</p>
                <p className="font-bold">{rank}위</p>
              </div>
            </div>
            <button className="mt-4 w-full py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md transition-colors">
              프로필 편집
            </button>
          </div>
          
          {/* 배지 및 업적 */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-4`}>
            <h3 className="font-bold mb-3">대표 배지</h3>
            <div className="flex space-x-3 justify-center mb-3">
              {badges.filter(b => b.unlocked).slice(0, 3).map(badge => (
                <div key={badge.id} className="text-center">
                  <div className="text-4xl mb-1">{badge.image}</div>
                  <p className="text-xs font-medium">{badge.name}</p>
                </div>
              ))}
              {badges.filter(b => b.unlocked).length === 0 && (
                <p className="text-sm text-gray-500">아직 획득한 배지가 없습니다.</p>
              )}
            </div>
            <button 
              className="w-full py-2 text-sm bg-gray-100 hover:bg-gray-200 font-medium rounded-md transition-colors"
              onClick={() => {
                setActiveTab('quest');
                // 배지 탭으로 이동
              }}
            >
              모든 배지 보기
            </button>
          </div>
          
          {/* 친구 목록 */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-4`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">친구 목록</h3>
              <button className="text-sm text-blue-500">친구 추가</button>
            </div>
            <div className="space-y-3">
              {friends.map(friend => (
                <div key={friend.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                  <div className="flex items-center">
                    <div className="text-2xl mr-2">{friend.avatar}</div>
                    <div>
                      <p className="font-medium">{friend.name}</p>
                      <p className="text-xs text-gray-500">최근 활동: {friend.lastActive}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Lv.{friend.level}</p>
                    <p className="text-xs text-gray-500">{friend.points} 포인트</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 설정 섹션 */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
            <h3 className="font-bold mb-3">설정</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 border-b">
                <div className="flex items-center">
                  <Bell size={18} className="mr-2 text-gray-500" />
                  <p>알림 설정</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    checked={isNotificationsEnabled}
                    onChange={toggleNotifications}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label 
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                      isNotificationsEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 border-b">
                <div className="flex items-center">
                  <Settings size={18} className="mr-2 text-gray-500" />
                  <p>다크 모드</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label 
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                      theme === 'dark' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 border-b">
                <div className="flex items-center">
                  <Map size={18} className="mr-2 text-gray-500" />
                  <p>위치 서비스</p>
                </div>
                <div className="text-sm text-gray-500">
                  {loadingLocation ? '위치 가져오는 중...' : '켜짐'}
                </div>
              </div>
              <div className="flex justify-between items-center p-2">
                <div className="flex items-center">
                  <Gift size={18} className="mr-2 text-gray-500" />
                  <p>친구 초대</p>
                </div>
                <button 
                  className="text-sm text-blue-500"
                  onClick={() => inviteFriend("example@example.com")}
                >
                  초대하기
                </button>
              </div>
            </div>
            <div className="mt-4">
              <button className="w-full py-2 text-red-500 font-medium">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 튜토리얼 화면 컴포넌트
  const TutorialScreen = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const totalSteps = 4;
    
    const nextStep = () => {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        onComplete();
      }
    };
    
    const skipTutorial = () => {
      onComplete();
    };
    
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          {step === 1 && (
            <>
              <div className="text-6xl mb-6">🌍</div>
              <h2 className="text-xl font-bold mb-3">환영합니다!</h2>
              <p className="text-center mb-8">
                EcoQuest에 오신 것을 환영합니다! 환경을 지키며 포인트도 모으고 친구들과 함께 환경 보호에 동참해보세요.
              </p>
              <div className="w-full max-w-xs">
                <img src="/api/placeholder/300/200" alt="튜토리얼 이미지" className="rounded-lg shadow-lg mb-4" />
              </div>
            </>
          )}
          
          {step === 2 && (
            <>
              <div className="text-6xl mb-6">🗑️</div>
              <h2 className="text-xl font-bold mb-3">쓰레기 몬스터 포획하기</h2>
              <p className="text-center mb-8">
                주변의 쓰레기 몬스터를 AR 카메라로 포획해 포인트를 얻고 환경을 깨끗하게 만드세요.
              </p>
              <div className="w-full max-w-xs">
                <img src="/api/placeholder/300/200" alt="AR 사용 방법" className="rounded-lg shadow-lg mb-4" />
              </div>
            </>
          )}
          
          {step === 3 && (
            <>
              <div className="text-6xl mb-6">🛑</div>
              <h2 className="text-xl font-bold mb-3">무단투기 신고하기</h2>
              <p className="text-center mb-8">
                무단투기 발견 시 지도에서 위치를 표시하고 신고하여 깨끗한 동네를 만드는데 기여하세요.
              </p>
              <div className="w-full max-w-xs">
                <img src="/api/placeholder/300/200" alt="무단투기 신고 방법" className="rounded-lg shadow-lg mb-4" />
              </div>
            </>
          )}
          
          {step === 4 && (
            <>
              <div className="text-6xl mb-6">🏆</div>
              <h2 className="text-xl font-bold mb-3">미션과 배지</h2>
              <p className="text-center mb-8">
                다양한 미션을 완료하고 배지를 모아 친구들과 경쟁해보세요
              </p>
              <div className="w-full max-w-xs">
                <img src="/api/placeholder/300/200" alt="미션과 배지" className="rounded-lg shadow-lg mb-4" />
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 w-full">
          <div className="flex justify-between items-center mb-4">
            <button 
              className="text-sm text-gray-500"
              onClick={skipTutorial}
            >
              건너뛰기
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < step ? 'bg-green-500' : 'bg-gray-300'}`}
                ></div>
              ))}
            </div>
            <div className="w-16"></div> {/* 오른쪽 여백 */}
          </div>
          <button 
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            onClick={nextStep}
          >
            {step < totalSteps ? '다음' : '시작하기'}
          </button>
        </div>
      </div>
    );
  };

  // 로그인 화면 컴포넌트
  const LoginScreen = ({ onLogin, onCancel }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    
    const handleSubmit = (e) => {
      e.preventDefault();
      // 실제 구현에서는 API 연동 필요
      onLogin();
    };
    
    return (
      <div className="flex flex-col h-full bg-white p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{isSignUp ? '회원가입' : '로그인'}</h2>
          <button onClick={onCancel} className="p-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-lg font-bold mb-2">에코퀘스트</h3>
            <p className="text-center text-gray-600">
              환경을 지키는 즐거운 방법
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="이메일 주소"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="비밀번호"
                required
              />
            </div>
            
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="비밀번호 확인"
                  required
                />
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            >
              {isSignUp ? '가입하기' : '로그인'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
              <button 
                className="ml-1 text-green-600 font-medium"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? '로그인' : '회원가입'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 하단 네비게이션 바
  const BottomNav = () => (
    <div className={`fixed bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t flex items-center justify-around p-2 z-10`}>
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-blue-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
      >
        <Home size={20} />
        <span className="text-xs mt-1">홈</span>
      </button>
      <button
        onClick={() => setActiveTab('quest')}
        className={`flex flex-col items-center p-2 ${activeTab === 'quest' ? 'text-purple-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
      >
        <Award size={20} />
        <span className="text-xs mt-1">퀘스트</span>
      </button>
      <button
        onClick={() => setCameraActive(true)}
        className="flex flex-col items-center justify-center bg-green-500 rounded-full w-12 h-12 -mt-4 shadow-lg text-white"
      >
        <Camera size={20} />
      </button>
      <button
        onClick={() => setActiveTab('map')}
        className={`flex flex-col items-center p-2 ${activeTab === 'map' ? 'text-blue-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
      >
        <Map size={20} />
        <span className="text-xs mt-1">지도</span>
      </button>
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-green-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
      >
        <User size={20} />
        <span className="text-xs mt-1">프로필</span>
      </button>
    </div>
  );

  // 개인화된 CSS (다크 모드 포함)
  const customStyles = `
    /* 토글 스위치 스타일 */
    .toggle-checkbox:checked {
      right: 0;
      border-color: #10B981;
    }
    .toggle-checkbox:checked + .toggle-label {
      background-color: #10B981;
    }
    .toggle-checkbox {
      right: 0;
      transition: all 0.3s;
    }
    .toggle-label {
      transition: all 0.3s;
    }
    
    /* 다크 모드 추가 스타일 */
    .dark-mode {
      background-color: #1A202C;
      color: #E2E8F0;
    }
    
    /* 애니메이션 */
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    .animate-bounce {
      animation: bounce 1s infinite;
    }
  `;

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <style>{customStyles}</style>
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
      {!cameraActive && !showTutorial && !showLoginPrompt && <BottomNav />}
    </div>
  );
  };

  export default EcoQuestApp;