# 현장 일정 날씨판

오늘 현장 일정과 지역별 날씨를 한 화면에서 보고, 날씨 때문에 주의 · 중지를 검토할 일정을 표시합니다. (교육용 가상 데이터)

## 여는 법
- 내 PC : `index.html` 더블클릭
- 인터넷 : https://weatherboard-gamma.vercel.app/

## Supabase 설정
1. Supabase 프로젝트의 SQL Editor에서 `setup.sql` 전체를 실행합니다. 표 생성·값 제약·RLS 정책·가상 일정 6건을 설정합니다. 다시 실행해도 기존 데이터를 지우지 않으며, 빈 표에만 기본 일정을 넣습니다.
2. `config.js`의 두 줄에 프로젝트 주소와 공개용 키(publishable 또는 기존 anon)를 입력합니다. secret·service_role 키는 사용하지 않습니다.
3. 배포 주소 또는 `index.html`을 엽니다. Supabase와 날씨 조회에는 인터넷 연결이 필요합니다.

일정은 Supabase `wx_tasks`에서 읽고 추가도 같은 표에 저장합니다. 다른 브라우저에서 새로고침하면 추가된 일정을 볼 수 있습니다. 기존 브라우저 추가 일정은 자동으로 DB에 옮기지 않습니다. `data/tasks.json`은 이전 단원 참고용이며 현재 화면에서는 읽지 않습니다.

로그인 없는 교육용으로, 공개 방문자는 가상 일정을 조회·추가할 수 있습니다. 수정·삭제 권한은 부여하지 않습니다. DB는 지역 4곳(세종·대전·태안·보령), 구분 3개(야외·고소·실내), 빈 값이 아닌 일정명·담당을 검사합니다.

## 확인 방법
- T-01: 설정 후 기본 일정 6건을 확인합니다.
- T-02: 가상 일정 추가 후 새로고침해 유지되는지 확인합니다.
- T-03·T-04: 날씨와 `?test=wind`의 고소 일정 판단을 확인합니다.
- T-07: ‘오늘 판단 md로 저장’으로 현재 표와 기준을 내려받습니다.
- T-08: 다른 브라우저에서 같은 배포 주소를 열어 추가한 일정이 보이는지 확인합니다(새로고침 기준).
- T-09: SQL Editor에서 아래 검증문을 각각 실행합니다. 제약 오류가 나며 잘못된 행이 저장되지 않아야 합니다.

```sql
insert into public.wx_tasks (title, region, kind, owner)
values ('제약 검증', '서울', '야외', '가상담당');
```
```sql
insert into public.wx_tasks (title, region, kind, owner)
values ('제약 검증', '세종', '기타', '가상담당');
```

연결 정보 누락·외부 스크립트 로딩 실패·DB 조회/저장 실패 시 화면 안내를 확인합니다. 저장 실패 시 입력은 유지됩니다.

## 파일
| 파일 | 역할 |
|---|---|
| index.html | 화면 구조 |
| style.css | 디자인 |
| logic.js | 판단 규칙 |
| app.js | 화면 동작 |
| config.js | Supabase 주소·공개용 키 두 줄 |
| setup.sql | SQL Editor에서 직접 실행할 DB 설정 |
| PRD.md | 무엇을 · 왜 만드는지 |
| CLAUDE.md | AI가 지킬 작업 규칙 |
| .gitignore | GitHub에 올리지 않을 파일 목록 |
