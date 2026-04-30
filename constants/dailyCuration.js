// 가온의 "오늘의 한 곡" 큐레이션 풀
// - 클래식 한정 40곡, deterministic rotation (날짜 기반)
// - 표기는 콘서트 프로그램 톤 — 영문/원어 제목 + 조성·작품번호·별명, 원어 작곡가명
// - title (한글)은 데이터로만 보존 (검색·향후 AI 대화에서 활용 가능, 카드에 표시 X)
// - LLM/Firestore 기반 동적 큐레이션으로 교체할 때는 getTodayCuration()만 바꾸면 됨

export const CLASSICAL_CURATION = [
  { titleEn: 'Nocturne in E♭ major, Op.9 No.2', title: '녹턴 Op.9 No.2', composer: 'Frédéric Chopin', comment: '한 음 한 음에 봄밤의 숨결이 깃들어 있어요.' },
  { titleEn: 'Clair de lune (Suite bergamasque, L.75)', title: '달빛', composer: 'Claude Debussy', comment: '달빛이 호수에 닿는 순간을 그린 곡이에요.' },
  { titleEn: 'Moonlight Sonata, Op.27 No.2 — Adagio sostenuto', title: '월광 소나타 1악장', composer: 'Ludwig van Beethoven', comment: '고요함 속에서 가장 큰 감정이 흘러나와요.' },
  { titleEn: 'Canon in D major', title: '카논 D장조', composer: 'Johann Pachelbel', comment: '끝없이 이어지는 위로처럼 들리는 곡이에요.' },
  { titleEn: 'The Four Seasons, Op.8 — Spring (RV 269)', title: '사계 - 봄', composer: 'Antonio Vivaldi', comment: '새들이 노래하는 첫 봄날의 기쁨을 담았어요.' },
  { titleEn: 'Air on the G String, BWV 1068', title: 'G선상의 아리아', composer: 'Johann Sebastian Bach', comment: '단 한 줄의 선율로 우주가 펼쳐지는 순간이에요.' },
  { titleEn: 'Liebestraum No.3 in A♭ major, S.541', title: '사랑의 꿈 No.3', composer: 'Franz Liszt', comment: '사랑이 가장 따뜻하게 노래되는 순간이에요.' },
  { titleEn: 'Für Elise, WoO 59', title: '엘리제를 위하여', composer: 'Ludwig van Beethoven', comment: '누구에게나 자기만의 엘리제가 있죠.' },
  { titleEn: 'Fantaisie-Impromptu in C♯ minor, Op.66', title: '환상즉흥곡 Op.66', composer: 'Frédéric Chopin', comment: '마음 깊은 곳의 격정과 평온이 공존해요.' },
  { titleEn: "Symphony No.9 in D minor, Op.125 'Choral'", title: '교향곡 9번 \'합창\'', composer: 'Ludwig van Beethoven', comment: '기쁨이 모두를 하나로 묶는 순간을 들어보세요.' },
  { titleEn: 'Piano Concerto No.2 in C minor, Op.18', title: '피아노 협주곡 2번', composer: 'Sergei Rachmaninoff', comment: '겨울에서 봄으로 건너가는 마음의 여정이에요.' },
  { titleEn: 'Swan Lake, Op.20 — Scene', title: '백조의 호수 - 정경', composer: 'Pyotr Ilyich Tchaikovsky', comment: '호수 위로 별빛이 내려앉는 듯한 선율이에요.' },
  { titleEn: 'Tristan und Isolde, WWV 90 — Liebestod', title: '트리스탄과 이졸데 - 사랑의 죽음', composer: 'Richard Wagner', comment: '한 음 한 음에 사랑의 영원이 담겨 있어요.' },
  { titleEn: 'Humoresque No.7 in G♭ major, Op.101', title: '유모레스크 No.7', composer: 'Antonín Dvořák', comment: '장난기 어린 미소로 하루를 시작해보세요.' },
  { titleEn: 'La Campanella, S.141 No.3', title: '라 캄파넬라', composer: 'Franz Liszt', comment: '종소리가 빛처럼 흩어지는 곡이에요.' },
  { titleEn: 'Méditation from Thaïs', title: '타이스의 명상곡', composer: 'Jules Massenet', comment: '마음이 가장 고요해지는 순간을 위한 음악이에요.' },
  { titleEn: 'The Four Seasons, Op.8 — Autumn (RV 293)', title: '사계 - 가을', composer: 'Antonio Vivaldi', comment: '수확의 풍요와 안식이 함께 담겨 있어요.' },
  { titleEn: 'Piano Sonata No.11 in A major, K.331 — Rondo alla Turca', title: '터키 행진곡', composer: 'Wolfgang Amadeus Mozart', comment: '경쾌한 발걸음이 주는 작은 행복이에요.' },
  { titleEn: 'Suite for Variety Orchestra — Waltz No.2', title: '재즈 모음곡 2번 - 왈츠 No.2', composer: 'Dmitri Shostakovich', comment: '오래된 영화의 한 장면처럼 마음이 흔들려요.' },
  { titleEn: 'Brandenburg Concerto No.3 in G major, BWV 1048', title: '브란덴부르크 협주곡 3번', composer: 'Johann Sebastian Bach', comment: '정교한 직조의 아름다움을 느껴보세요.' },
  { titleEn: 'Hungarian Dance No.5 in F♯ minor, WoO 1', title: '헝가리 무곡 5번', composer: 'Johannes Brahms', comment: '자유분방한 박자가 마음을 들썩이게 해요.' },
  { titleEn: 'Ave Maria (Ellens Gesang III), D.839', title: '아베 마리아', composer: 'Franz Schubert', comment: '기도처럼 부드럽게 마음을 어루만지는 선율이에요.' },
  { titleEn: "A Midsummer Night's Dream, Op.61 — Wedding March", title: '한여름밤의 꿈 - 결혼 행진곡', composer: 'Felix Mendelssohn', comment: '한여름밤의 꿈에서 가장 빛나는 순간이에요.' },
  { titleEn: 'Kinderszenen, Op.15 — Träumerei', title: '어린이 정경 - 트로이메라이', composer: 'Robert Schumann', comment: '어린 시절의 꿈처럼 다정한 선율이에요.' },
  { titleEn: 'Symphony No.40 in G minor, K.550 — Mvt I', title: '교향곡 40번 1악장', composer: 'Wolfgang Amadeus Mozart', comment: '긴장과 우아함이 절묘하게 어우러져요.' },
  { titleEn: 'Nocturne in D♭ major, Op.27 No.2', title: '녹턴 Op.27 No.2', composer: 'Frédéric Chopin', comment: '달이 천천히 떠오르는 시간을 닮았어요.' },
  { titleEn: 'Pictures at an Exhibition — The Great Gate of Kiev', title: '전람회의 그림 - 키예프의 대문', composer: 'Modest Mussorgsky', comment: '장엄한 종소리 속에서 새로운 시작을 느껴보세요.' },
  { titleEn: 'Piano Concerto No.1 in B♭ minor, Op.23 — Mvt I', title: '피아노 협주곡 1번 1악장', composer: 'Pyotr Ilyich Tchaikovsky', comment: '첫 도입부터 마음을 사로잡는 명곡이에요.' },
  { titleEn: "Symphony No.9 'From the New World', Op.95 — Largo", title: '신세계 교향곡 2악장', composer: 'Antonín Dvořák', comment: '낯선 곳에서 들려오는 그리운 노래예요.' },
  { titleEn: 'Goldberg Variations, BWV 988 — Aria', title: '골드베르크 변주곡 - 아리아', composer: 'Johann Sebastian Bach', comment: '단순한 선율이 깊어지는 명상의 시간이에요.' },
  { titleEn: 'The Carnival of the Animals — The Swan', title: '동물의 사육제 - 백조', composer: 'Camille Saint-Saëns', comment: '고요한 수면 위를 미끄러지는 듯한 선율이에요.' },
  { titleEn: 'The Four Seasons, Op.8 — Summer (RV 315)', title: '사계 - 여름', composer: 'Antonio Vivaldi', comment: '한여름 폭풍 직전의 긴장감이 느껴져요.' },
  { titleEn: 'Boléro, M.81', title: '볼레로', composer: 'Maurice Ravel', comment: '하나의 리듬이 거대한 파도로 자라는 순간이에요.' },
  { titleEn: 'Ballade No.1 in G minor, Op.23', title: '발라드 1번', composer: 'Frédéric Chopin', comment: '한 편의 시처럼 흐르는 피아노의 서사예요.' },
  { titleEn: 'Pathétique Sonata, Op.13 — Adagio cantabile', title: '비창 소나타 2악장', composer: 'Ludwig van Beethoven', comment: '슬픔이 가장 따뜻하게 노래되는 순간이에요.' },
  { titleEn: 'Piano Concerto No.21 in C major, K.467 — Andante', title: '피아노 협주곡 21번 2악장', composer: 'Wolfgang Amadeus Mozart', comment: '천상의 노래처럼 맑고 투명한 선율이에요.' },
  { titleEn: 'Sarabande in D minor, HWV 437', title: '사라방드', composer: 'George Frideric Handel', comment: '느린 박자 속에서 시간이 멈춘 듯한 곡이에요.' },
  { titleEn: 'Gianni Schicchi — O mio babbino caro', title: '잔니 스키키 - 오 사랑하는 나의 아버지', composer: 'Giacomo Puccini', comment: '마음을 가장 부드럽게 적시는 아리아예요.' },
  { titleEn: 'Impromptu in G♭ major, D.899 No.3', title: '즉흥곡 Op.90 No.3', composer: 'Franz Schubert', comment: '잔잔한 호수 위 작은 물결처럼 흐르는 곡이에요.' },
  { titleEn: 'Vocalise, Op.34 No.14', title: '보칼리제', composer: 'Sergei Rachmaninoff', comment: '말보다 깊은 곳에 닿는 노래 없는 노래예요.' },
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
