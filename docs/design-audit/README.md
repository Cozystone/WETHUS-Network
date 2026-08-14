# WETHUS Network OS Design Audit

## 점검 결과

1. **현행 Home**: 블랙/오렌지 편집 디자인은 강하지만, 긴 랜딩 구조와 프로젝트 카드가 Network OS의 개인화된 첫 행동을 보여주지 못했습니다.
2. **현행 Explore**: 카테고리 탐색은 명확하지만 프로젝트 목록에서 사람, ASK, 기회로 이어지는 관계가 약했습니다.
3. **현행 Profile**: 기본 정보는 읽기 쉽지만 실행 근거가 여러 카드에 분산되어 포트폴리오의 시간 흐름이 보이지 않았습니다.
4. **현행 Project Hub**: 도구와 활동 데이터는 존재하지만 모든 패널의 시각적 우선순위가 비슷해 다음 행동을 찾기 어려웠습니다.
5. **모바일 현행 화면**: 상단 내비게이션 줄바꿈과 큰 타이포그래피의 잘림이 주요 위험이었습니다.
6. **Network OS 데스크톱**: 좌측 탐색, 중앙 작업 화면, 우측 문맥 레일의 세 구역으로 역할을 분리했고 핵심 행동을 첫 화면에 배치했습니다.
7. **Network OS 모바일**: 헤더와 5개 핵심 하단 탭으로 압축했으며 375px 기준 수평 오버플로 없이 확인했습니다.
8. **상호작용**: People/Projects/Opportunities 필터, 통합 검색, 연결, 저장, ASK 생성, Workspace 탭, Copilot 응답을 브라우저에서 검증했습니다.

## 디자인 판단

- 유지: 검정 배경, 오렌지 액센트, 굵은 편집 타이포그래피, 실행 중심의 직설적 문장
- 변경: 마케팅 랜딩 중심 구조를 반복 사용 가능한 제품 셸로 전환
- 추가: Activity → Semantic Record → Match → Action 루프, Living Portfolio, ASK/OFFER, Context Rail
- 제한: 이번 산출물은 디자인과 핵심 상호작용을 검증하는 독립 프리뷰이며 운영 데이터는 변경하지 않습니다.

## 주요 캡처

- 현행 데스크톱: `01-live-home-desktop.png` ~ `04-live-project-hub-desktop.png`
- 현행 모바일: `05-live-home-mobile.png`, `06-live-profile-mobile.png`
- 새 화면 데스크톱: `07-preview-for-you-desktop.png` ~ `12-preview-living-portfolio-desktop.png`, `18-preview-opportunities-desktop.png`, `19-preview-for-you-desktop-final.png`
- 새 화면 모바일: `13-preview-for-you-mobile.png` ~ `17-preview-for-you-mobile-final.png`
- 배포 검증: `20-deployed-for-you-desktop.png`
