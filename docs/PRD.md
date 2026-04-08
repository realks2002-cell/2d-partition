# PRD: 화담디자인 칸막이 시공 시뮬레이터 (Android MVP)

## Context

화담디자인 허재원 실장은 현장 실측 → 도면 → 견적 업무를 수행하며, 현재 Gemini 웹UI로 시공후 이미지를 렌더링하고 있으나 **완료까지 3~10회 반복 수정**이 발생한다.

본 프로젝트는 **실장 1인 전용 안드로이드 앱**으로, 현장에서 스마트폰으로 바로 촬영 → 치수 입력 → AI 렌더링 → 견적/입면도 출력까지 **현장 내 완결형 워크플로우**를 제공한다.

핵심 차별화:
1. **드로잉 없는 "간편 모드"** — 치수만 입력하면 AI가 공간 자동 감지 후 렌더링
2. **구조화된 프롬프트 + 마스킹** — 반복수정 1~2회로 감축
3. **현장 친화 UX** — 카메라 직결, 오프라인 큐잉, 큰 터치 타겟

---

## 1. 제품 개요

- **제품명**: 화담 칸막이 시뮬레이터
- **플랫폼**: **Android 네이티브 앱** (Capacitor 기반 웹뷰 하이브리드)
- **대상**: 허재원 실장 1인
- **배포**: APK 직접 설치 (Play Store 미등록)
- **최소 사양**: Android 10+ (API 29)

## 2. 아키텍처 선택: Capacitor 하이브리드

### 왜 Capacitor인가
| 옵션 | 장단점 |
|---|---|
| **Capacitor (선택)** | 웹 기술(Next.js) 그대로 → Vercel 백엔드 재사용, 카메라/파일/공유 네이티브 API 지원, 1인 개발 생산성 최상 |
| React Native | 네이티브 성능 우수하나 UI 재작성 필요, Next.js 백엔드와 이중화 |
| Flutter | 생태계 차이, 기존 웹 자산 활용 불가 |
| Kotlin 네이티브 | 오버스펙, 개발기간 3배 |

**결론**: Capacitor로 웹앱을 감싸되, **카메라/파일/공유는 네이티브 플러그인** 사용.

### 구조
```
┌─────────────────────────────────┐
│  Android APK (Capacitor)        │
│  ├─ WebView: Next.js Static     │
│  │   (UI + 로컬 상태)           │
│  └─ Native Plugins              │
│     ├─ Camera                   │
│     ├─ Filesystem               │
│     ├─ Share                    │
│     └─ Network                  │
└──────────────┬──────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────┐
│  Vercel (API Routes)            │
│  ├─ /api/render (Gemini Proxy) │
│  ├─ /api/projects (CRUD)        │
│  └─ /api/pdf                    │
├─────────────────────────────────┤
│  Neon Postgres (Drizzle ORM)   │
│  Vercel Blob (사진/결과물)      │
└─────────────────────────────────┘
```

## 3. 사용자 스토리

### 시나리오 A — 현장 촬영 기반
1. 현장 도착 → 앱 실행 → "촬영" 버튼
2. 네이티브 카메라로 현장 촬영
3. 치수(W×H×D) 입력
4. 재질/색상/도어 프리셋 선택
5. "렌더링 생성" → 15~30초 후 4장 그리드
6. 마음에 드는 1장 선택 → 필요 시 "상단 프레임 얇게" 등 추가 지시 → 재생성
7. 자동 생성된 입면도 확인
8. PDF 또는 이미지로 **"카톡 공유"** 네이티브 공유 시트에서 바로 전송
9. 오프라인 상황 시 자동 큐잉 → 네트워크 복구 시 렌더링

### 시나리오 B — 도면 파일 기반
1. 홈 → "도면 불러오기" → PNG/JPG/DWG 파일 선택
2. DWG인 경우 자동 서버 변환 (수 초)
3. 도면 위 두 점 찍고 실측 mm 입력 → 스케일 자동 계산
4. 필요한 치수선 추가 드로잉
5. 재질/색상/도어 프리셋 선택 (치수는 자동 주입)
6. "렌더링 생성" → 도면을 참조 이미지로 사용해 AI 렌더링
7. 이후 시나리오 A의 7~9단계와 동일

## 4. 기능 요구사항 (MVP)

> 단순화 원칙: 프로젝트 관리/견적/인증 없이, **촬영 → 치수입력 → 렌더링 → 입면도 → 공유** 일직선 플로우

### FR-2. 카메라 & 사진
- [ ] Capacitor Camera 플러그인으로 촬영/앨범 선택
- [ ] 다중 사진 업로드
- [ ] 업로드 큐 (오프라인 대응)
- [ ] EXIF 회전 자동 보정

### FR-2b. 도면 파일 불러오기 (신규)
- [ ] 지원 포맷: **PNG / JPG / DWG**
- [ ] Capacitor Filesystem + File Picker로 기기 내 파일 선택
- [ ] PNG/JPG: 웹뷰에서 바로 표시
- [ ] **DWG 처리**:
  - 클라이언트 단독 파싱 불가 → **서버(Vercel API)에서 변환**
  - `/api/dwg-convert` 엔드포인트: DWG → SVG/PNG
  - 변환 라이브러리: **LibreDWG** (WASM 빌드) 또는 **ODA File Converter** CLI
  - 대안: 외부 API (CloudConvert, AutoCAD Forge/APS) — 유료
  - MVP 1차: LibreDWG WASM으로 DWG → SVG 서버 변환 시도
- [ ] 변환된 도면을 배경으로 삼아 렌더링/치수 입력 가능
- [ ] 도면 자체를 AI 렌더링의 레퍼런스 입력으로 사용 (입면 스타일 힌트)

### FR-2c. 도면 위 치수 입력 (신규)
- [ ] 불러온 도면(PNG/JPG/DWG-변환본) 위에 **치수선 드로잉**
  - 두 점 찍기 → 실측 mm 입력 → 스케일 자동 계산
  - 추가 치수선은 동일 스케일 자동 적용
- [ ] 치수 라벨 편집/삭제
- [ ] 도면 + 치수 주석을 PNG/SVG로 저장
- [ ] 저장된 치수값이 FR-3 스펙 입력에 자동 주입 (W/H/D)
- [ ] Fabric.js 기반 (이미 정밀모드에서 사용)

### FR-3. 치수 & 스펙 입력
- [ ] 숫자키패드 최적화 입력 UI
- [ ] W × H × D (mm)
- [ ] 재질 프리셋: 유리+알루미늄 / 유리+스틸 / MDF / PET
- [ ] 프레임 색상, 패널 색상
- [ ] 도어: 없음 / 슬라이딩 / 여닫이
- [ ] 유리 타입: 투명 / 반투명 / 컬러

### FR-4. AI 렌더링 (핵심)
- [ ] **초기 생성: Imagen 4** — 사실적 품질, 현장사진 + 프롬프트로 4장 병렬 생성
- [ ] **수정 지시: Gemini 2.5 Flash Image** — 선택한 이미지 + 마스크 + 자연어("프레임 얇게") 인페인팅
- [ ] **공간 자동 감지 (간편모드)**: Gemini 2.5 Pro Vision이 현장사진 분석 → 칸막이 bbox 반환 → 자동 마스크 생성
- [ ] 스펙 → 프롬프트 자동 변환 템플릿 (재질/색상/도어/유리 타입)
- [ ] 4장 그리드 → 선택 → 추가 지시 → 재생성 루프
- [ ] 렌더링 히스토리 & 버전 관리 (로컬 SQLite)
- [ ] Phase 0에서 A/B/C 조합 검증 후 최종 확정

### FR-5. AI 렌더링 — 정밀 모드 (선택, 마스킹 지원)
- [ ] 간편 모드 결과가 부정확할 때만 사용
- [ ] 사진 위 손가락 드로잉 (Konva 또는 react-native-canvas 대신 **웹뷰 내 Fabric.js**)
- [ ] 마스크 PNG 생성 → 인페인팅 호출

### FR-6. 입면도 자동생성
- [ ] SVG 기반 정면도 (W×H 치수선 + 도어 위치)
- [ ] PNG 다운로드
- [ ] (Phase 2) DXF 내보내기

### FR-8. PDF & 공유
- [ ] `@react-pdf/renderer`로 PDF 생성
  - 시공전 사진 / 시공후 렌더링 / 입면도 (치수 표기)
- [ ] Capacitor Share 플러그인으로 **카톡/메일/드라이브** 네이티브 공유
- [ ] Filesystem에 로컬 저장
- [ ] 결과 이미지 단독 공유도 지원 (PDF 없이 빠르게)

### FR-10. 오프라인 지원
- [ ] 프로젝트/사진/견적은 로컬 우선
- [ ] 렌더링만 온라인 필수
- [ ] 네트워크 상태 인디케이터

## 5. 비기능 요구사항

- **성능**: 앱 콜드 스타트 2초 이내, 렌더링 첫 응답 30초 이내
- **반응형**: 세로모드 우선, 가로모드도 지원
- **접근성**: 큰 터치 타겟(최소 44dp), 고대비 모드
- **저장공간**: 로컬 캐시 최대 500MB, 오래된 데이터 자동 정리
- **보안**: HTTPS 강제, API Key 네이티브 Secure Storage 보관

## 6. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js 16** (Static Export 모드) + TS strict | Capacitor 래핑 대상 |
| 네이티브 래퍼 | **Capacitor 6** | Android 빌드 |
| UI | shadcn/ui + Tailwind | 모바일 우선 반응형 |
| 아이콘 | Lucide | 글로벌 규칙 |
| 상태 관리 | Zustand | 경량 |
| 로컬 DB | **@capacitor-community/sqlite** | 최근 이력 저장 |
| 캔버스(정밀모드/치수) | Fabric.js | 마스킹 + 치수선 드로잉 |
| 파일 피커 | `@capawesome/capacitor-file-picker` | PNG/JPG/DWG 선택 |
| DWG 변환 | **LibreDWG (WASM)** 서버사이드 / 폴백: CloudConvert API | DWG → SVG/PNG |
| AI 렌더링 (메인) | **Imagen 4** (`imagen-4.0-generate-preview`) | 초기 4장 생성, 사실적 품질 |
| AI 렌더링 (수정) | **Gemini 2.5 Flash Image** (Nano Banana) | 인페인팅/자연어 수정 지시 |
| 공간 자동 감지 | Gemini 2.5 Pro Vision | 간편모드 bbox 추출 |
| AI SDK | `@google/genai` | 세 모델 통합 호출 |
| 백엔드 | Next.js API Routes (Vercel) | |
| 파일 저장 | 디바이스 로컬(Filesystem) | 서버 저장소 불필요 |
| PDF | `@react-pdf/renderer` | 웹뷰 내 생성 |
| 공유 | `@capacitor/share` | 네이티브 공유 시트 |
| 카메라 | `@capacitor/camera` | |
| 파일시스템 | `@capacitor/filesystem` | |
| 네트워크 | `@capacitor/network` | 오프라인 감지 |
| 배포 | Android APK 사이드로드 | Play Store 미사용 |

## 7. 데이터 모델 (단일 세션 단위, 프로젝트 개념 없음)

```
Session (로컬 SQLite에만 저장, 최근 이력 열람용)
  id, createdAt, thumbnailPath, memo?

SourceAsset  (사진 또는 도면)
  id, sessionId, kind (photo | png | jpg | dwg)
  originalPath, displayPath (DWG는 변환본 SVG/PNG 경로)
  dimensionAnnotations (JSON: 치수선 points + mm + 계산된 스케일)

Partition
  id, sessionId, sourceAssetId
  widthMm, heightMm, depthMm
  material, frameColor, panelColor
  doorType, glassType
  mode (simple | precise)
  maskPath? (정밀 모드만)

Rendering
  id, partitionId, localPath, promptUsed, version, selected, createdAt
```

> 서버 DB 불필요 (인증/프로젝트 관리 제거). Gemini 호출만 서버 프록시.

## 8. 화면 구성 (모바일 세로)

1. **홈** — "촬영 시작" + "도면 불러오기" 두 개 큰 버튼 + 최근 작업 썸네일
2. **카메라 / 파일 선택** — 네이티브 카메라 또는 파일 피커 (PNG/JPG/DWG)
2b. **도면 치수 입력** — Fabric.js 캔버스, 두 점 찍고 실측 mm 입력 → 스케일 자동, 치수선 추가
3. **치수 & 스펙 입력** — 큰 숫자 입력, 스펙 칩 선택, "렌더링" CTA
4. **렌더링 결과** — 4장 그리드, 하단 추가지시 입력창, 선택 시 확대
5. **입면도 뷰어** — SVG + 치수선
6. **결과 요약 & 공유** — PDF/이미지 선택, 네이티브 공유 시트
7. **설정** — 로컬 데이터 정리, API 상태

## 9. 개발 단계

### Phase 0 — 렌더링 엔진 A/B/C 검증 (우선)
- Next.js 웹앱으로 3가지 조합 비교 테스트
  - A: Imagen 4 단독
  - B: Imagen 4 (초기) + Gemini 2.5 Flash Image (수정)
  - C: Gemini 2.5 Flash Image 단독
- 실제 현장사진 3장 + 스펙 3세트 → 실장 주관 평가
- 성공 기준: **3회 이내 수정으로 납품 가능**
- 실패 시 대안: Imagen 4 Ultra, Flux Fill, Stable Diffusion Inpaint

### Phase 1 — 웹앱 MVP
- FR-1 ~ FR-8 웹 버전 완성
- Vercel 배포, 브라우저에서 기능 검증

### Phase 2 — Capacitor 안드로이드 래핑
- Capacitor 프로젝트 초기화 (`npx cap add android`)
- Next.js `output: 'export'` 설정 → 정적 빌드
- 네이티브 플러그인 연결 (카메라/공유/파일/SQLite/생체/네트워크)
- Android Studio에서 APK 빌드
- 실장 기기에 사이드로드 설치 & 실사용 테스트

### Phase 3 — 고도화 (추후)
- **3D 파라메트릭 뷰어** (Three.js + react-three-fiber)
  - 치수 실시간 반영, 회전/줌
  - 입면도/평면도 자동 추출
- **AR 합성** — 현장사진 위 3D 모델 원근 오버레이
- DXF 정식 내보내기
- 고객 공유 링크 (웹 전용)
- 시공 이력 검색/통계
- iOS 버전 (동일 Capacitor 코드)
- Play Store 등록 (필요 시)

## 10. 리스크

| 리스크 | 대응 |
|---|---|
| Gemini 렌더링 품질 | Phase 0 프로토타입 선검증 |
| 자동 공간 감지 실패 | 정밀 모드(수동 마스킹) 폴백 |
| Capacitor 카메라 권한 이슈 | AndroidManifest에 CAMERA/STORAGE 명시, 런타임 권한 요청 |
| 오프라인 큐 데이터 유실 | SQLite 트랜잭션 + 재시도 로직 |
| APK 수동 배포 귀찮음 | GitHub Release에 APK 업로드, 앱 내 자동 업데이트 체크 |
| Gemini API 비용 | 월 한도 설정, 캐싱 |
| DWG 변환 호환성 | LibreDWG 미지원 버전 존재 → 실패 시 CloudConvert API 폴백, 최악의 경우 사용자가 DWG를 PDF/PNG로 미리 내보내도록 안내 |

## 11. 비용

- 개발: Claude Code 구독료만
- 월 운영:
  - Vercel Hobby $0
  - Neon Free $0
  - Vercel Blob $0~5
  - Imagen 4 + Gemini Flash Image ~$10 (240장 기준, $0.04/장)
  - **합계 월 1~2만원**
- 개발자 계정: Play Store 미등록이므로 **$25 불필요**

## 12. 크리티컬 파일/경로 (구현 시)

```
rander-app/
├─ app/                       # Next.js App Router
│  ├─ (auth)/lock/
│  ├─ projects/
│  ├─ projects/[id]/
│  └─ api/
│     ├─ render/route.ts      # Gemini 프록시
│     ├─ projects/route.ts
│     └─ pdf/route.ts
├─ components/
│  ├─ camera-capture.tsx      # Capacitor Camera 래퍼
│  ├─ partition-form.tsx
│  ├─ rendering-grid.tsx
│  ├─ elevation-svg.tsx
│  └─ quote-table.tsx
├─ lib/
│  ├─ gemini/prompt-builder.ts  # 스펙 → 프롬프트 템플릿
│  ├─ db/schema.ts              # Drizzle
│  ├─ pricing/table.json        # 단가
│  └─ capacitor/                # 네이티브 브릿지
├─ android/                   # Capacitor 생성
├─ capacitor.config.ts
├─ next.config.ts             # output: 'export'
└─ package.json
```

## 13. 검증 방법

- **Phase 0**: 현장사진 3장 + 스펙 3세트로 Gemini 결과를 실장이 평가 → 3회 이내 수정으로 납품 가능 여부
- **Phase 1 웹 MVP**: 브라우저에서 전체 플로우 완주, PDF 출력 확인
- **Phase 2 안드로이드**: 실장 기기에 APK 설치 → 실제 신규 프로젝트 1건 수행 → 기존 Gemini 워크플로우 대비 소요시간/수정횟수 비교
- **성공 기준**: 현장 도착부터 고객 PDF 전달까지 **10분 이내**, 렌더링 수정 **평균 2회 이내**

## 14. 다음 단계

1. 본 PRD 승인
2. `/pdca design` 으로 상세 설계 (API 스펙, DB 스키마, 컴포넌트 트리, Gemini 프롬프트 템플릿)
3. **Phase 0 프로토타입** 먼저 (Gemini 품질 검증)
4. 통과 시 Phase 1 → Phase 2 순차 진행
