// 가온의 "오늘의 한 곡" 큐레이션 풀
// - 클래식 한정 40곡, deterministic rotation (날짜 기반)
// - LLM/Firestore 기반 동적 큐레이션으로 교체할 때는 getTodayCuration()만 바꾸면 됨

export const CLASSICAL_CURATION = [
  { title: '녹턴 Op.9 No.2', composer: '프레데리크 쇼팽', comment: '한 음 한 음에 봄밤의 숨결이 깃들어 있어요.' },
  { title: '달빛', composer: '클로드 드뷔시', comment: '달빛이 호수에 닿는 순간을 그린 곡이에요.' },
  { title: '월광 소나타 1악장', composer: '루트비히 판 베토벤', comment: '고요함 속에서 가장 큰 감정이 흘러나와요.' },
  { title: '카논 D장조', composer: '요한 파헬벨', comment: '끝없이 이어지는 위로처럼 들리는 곡이에요.' },
  { title: '사계 - 봄', composer: '안토니오 비발디', comment: '새들이 노래하는 첫 봄날의 기쁨을 담았어요.' },
  { title: 'G선상의 아리아', composer: '요한 제바스티안 바흐', comment: '단 한 줄의 선율로 우주가 펼쳐지는 순간이에요.' },
  { title: '사랑의 꿈 No.3', composer: '프란츠 리스트', comment: '사랑이 가장 따뜻하게 노래되는 순간이에요.' },
  { title: '엘리제를 위하여', composer: '루트비히 판 베토벤', comment: '누구에게나 자기만의 엘리제가 있죠.' },
  { title: '환상즉흥곡 Op.66', composer: '프레데리크 쇼팽', comment: '마음 깊은 곳의 격정과 평온이 공존해요.' },
  { title: '교향곡 9번 \'합창\'', composer: '루트비히 판 베토벤', comment: '기쁨이 모두를 하나로 묶는 순간을 들어보세요.' },
  { title: '피아노 협주곡 2번', composer: '세르게이 라흐마니노프', comment: '겨울에서 봄으로 건너가는 마음의 여정이에요.' },
  { title: '백조의 호수 - 정경', composer: '표트르 차이콥스키', comment: '호수 위로 별빛이 내려앉는 듯한 선율이에요.' },
  { title: '트리스탄과 이졸데 - 사랑의 죽음', composer: '리하르트 바그너', comment: '한 음 한 음에 사랑의 영원이 담겨 있어요.' },
  { title: '유모레스크 No.7', composer: '안토닌 드보르자크', comment: '장난기 어린 미소로 하루를 시작해보세요.' },
  { title: '라 캄파넬라', composer: '프란츠 리스트', comment: '종소리가 빛처럼 흩어지는 곡이에요.' },
  { title: '타이스의 명상곡', composer: '쥘 마스네', comment: '마음이 가장 고요해지는 순간을 위한 음악이에요.' },
  { title: '사계 - 가을', composer: '안토니오 비발디', comment: '수확의 풍요와 안식이 함께 담겨 있어요.' },
  { title: '터키 행진곡', composer: '볼프강 아마데우스 모차르트', comment: '경쾌한 발걸음이 주는 작은 행복이에요.' },
  { title: '재즈 모음곡 2번 - 왈츠 No.2', composer: '드미트리 쇼스타코비치', comment: '오래된 영화의 한 장면처럼 마음이 흔들려요.' },
  { title: '브란덴부르크 협주곡 3번', composer: '요한 제바스티안 바흐', comment: '정교한 직조의 아름다움을 느껴보세요.' },
  { title: '헝가리 무곡 5번', composer: '요하네스 브람스', comment: '자유분방한 박자가 마음을 들썩이게 해요.' },
  { title: '아베 마리아', composer: '프란츠 슈베르트', comment: '기도처럼 부드럽게 마음을 어루만지는 선율이에요.' },
  { title: '한여름밤의 꿈 - 결혼 행진곡', composer: '펠릭스 멘델스존', comment: '한여름밤의 꿈에서 가장 빛나는 순간이에요.' },
  { title: '어린이 정경 - 트로이메라이', composer: '로베르트 슈만', comment: '어린 시절의 꿈처럼 다정한 선율이에요.' },
  { title: '교향곡 40번 1악장', composer: '볼프강 아마데우스 모차르트', comment: '긴장과 우아함이 절묘하게 어우러져요.' },
  { title: '녹턴 Op.27 No.2', composer: '프레데리크 쇼팽', comment: '달이 천천히 떠오르는 시간을 닮았어요.' },
  { title: '전람회의 그림 - 키예프의 대문', composer: '모데스트 무소륵스키', comment: '장엄한 종소리 속에서 새로운 시작을 느껴보세요.' },
  { title: '피아노 협주곡 1번 1악장', composer: '표트르 차이콥스키', comment: '첫 도입부터 마음을 사로잡는 명곡이에요.' },
  { title: '신세계 교향곡 2악장', composer: '안토닌 드보르자크', comment: '낯선 곳에서 들려오는 그리운 노래예요.' },
  { title: '골드베르크 변주곡 - 아리아', composer: '요한 제바스티안 바흐', comment: '단순한 선율이 깊어지는 명상의 시간이에요.' },
  { title: '동물의 사육제 - 백조', composer: '카미유 생상스', comment: '고요한 수면 위를 미끄러지는 듯한 선율이에요.' },
  { title: '사계 - 여름', composer: '안토니오 비발디', comment: '한여름 폭풍 직전의 긴장감이 느껴져요.' },
  { title: '볼레로', composer: '모리스 라벨', comment: '하나의 리듬이 거대한 파도로 자라는 순간이에요.' },
  { title: '발라드 1번', composer: '프레데리크 쇼팽', comment: '한 편의 시처럼 흐르는 피아노의 서사예요.' },
  { title: '비창 소나타 2악장', composer: '루트비히 판 베토벤', comment: '슬픔이 가장 따뜻하게 노래되는 순간이에요.' },
  { title: '피아노 협주곡 21번 2악장', composer: '볼프강 아마데우스 모차르트', comment: '천상의 노래처럼 맑고 투명한 선율이에요.' },
  { title: '사라방드', composer: '게오르크 프리드리히 헨델', comment: '느린 박자 속에서 시간이 멈춘 듯한 곡이에요.' },
  { title: '잔니 스키키 - 오 사랑하는 나의 아버지', composer: '자코모 푸치니', comment: '마음을 가장 부드럽게 적시는 아리아예요.' },
  { title: '즉흥곡 Op.90 No.3', composer: '프란츠 슈베르트', comment: '잔잔한 호수 위 작은 물결처럼 흐르는 곡이에요.' },
  { title: '보칼리제', composer: '세르게이 라흐마니노프', comment: '말보다 깊은 곳에 닿는 노래 없는 노래예요.' },
];

// 시간대별 인사말
export function getGreeting(hour) {
  if (hour >= 5 && hour < 12) return '좋은 아침이에요';
  if (hour >= 12 && hour < 18) return '좋은 오후예요';
  if (hour >= 18 && hour < 22) return '편안한 저녁이에요';
  return '고요한 밤이에요';
}

// 날짜 기반 deterministic rotation — 같은 날엔 같은 곡, 다음 날엔 다음 곡
export function getTodayCuration(date = new Date()) {
  // 2026년 1월 1일을 기준으로 며칠 지났는지 → 그 일수를 풀 길이로 나눈 나머지
  const epoch = new Date(2026, 0, 1).getTime();
  const dayIdx = Math.floor((date.getTime() - epoch) / 86400000);
  const idx = ((dayIdx % CLASSICAL_CURATION.length) + CLASSICAL_CURATION.length) % CLASSICAL_CURATION.length;
  return CLASSICAL_CURATION[idx];
}
