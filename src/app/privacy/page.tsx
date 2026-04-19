import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "개인정보처리방침 · 칸막이Go",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACY POLICY"
      title="개인정보처리방침"
      updatedAt="2026-04-19"
      intro={
        <p>
          칸막이Go(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요하게 생각하며,
          「개인정보 보호법」 및 관계 법령이 정한 바를 준수합니다. 본 방침은
          서비스가 수집하는 정보, 이용 목적, 제3자 제공 여부, 이용자의 권리 및
          행사 방법을 안내합니다.
        </p>
      }
      sections={[
        {
          title: "수집하는 개인정보 항목",
          body: (
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원가입 시: 아이디, 비밀번호(해시), 이름, 가입 기기 식별자</li>
              <li>결제 시: 결제 금액, 결제 수단, 주문번호, 승인번호, 영수증 URL (토스페이먼츠 위탁 처리)</li>
              <li>서비스 이용 시: 렌더링 사용 내역, 접속 IP, 디바이스 정보, 오류 로그</li>
              <li>촬영·업로드 이미지(렌더링 요청 시): 처리 후 서버에 저장하지 않음</li>
            </ul>
          ),
        },
        {
          title: "개인정보의 수집 및 이용 목적",
          body: (
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원 식별, 로그인, 단일 세션 관리</li>
              <li>렌더링 횟수 충전·차감 및 결제 처리</li>
              <li>환불·분쟁 대응, 법적 증빙</li>
              <li>서비스 품질 개선, 장애 대응, 통계 분석</li>
            </ul>
          ),
        },
        {
          title: "개인정보의 보유 및 이용 기간",
          body: (
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
              <li>결제 기록: 전자상거래법에 따라 5년</li>
              <li>접속 로그: 통신비밀보호법에 따라 3개월</li>
            </ul>
          ),
        },
        {
          title: "개인정보의 제3자 제공",
          body: (
            <p>
              서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 결제
              처리를 위해 아래 처리위탁을 수행합니다.
              <br /><br />
              <strong>위탁업체:</strong> 주식회사 토스페이먼츠
              <br />
              <strong>위탁 항목:</strong> 결제 승인, 취소, 환불 처리에 필요한 최소 정보
              <br />
              <strong>보유 기간:</strong> 위탁 종료 시 또는 관련 법령에서 정한 기간
            </p>
          ),
        },
        {
          title: "이용자의 권리 및 행사 방법",
          body: (
            <p>
              이용자는 언제든지 본인의 개인정보를 조회·정정·삭제·처리정지를 요청할
              수 있습니다. 요청은 서비스 내 계정 설정 또는{" "}
              <a href="mailto:privacy@kanmakigo.com" className="text-[#d43e76] underline">
                privacy@kanmakigo.com
              </a>{" "}
              으로 연락해주시기 바랍니다.
            </p>
          ),
        },
        {
          title: "개인정보의 안전성 확보 조치",
          body: (
            <ul className="list-disc pl-5 space-y-1.5">
              <li>비밀번호는 일방향 해시로 저장</li>
              <li>HTTPS 전송 구간 암호화</li>
              <li>관리자 권한 분리 및 접근 로그 보관</li>
              <li>단일 세션 강제(다른 기기 로그인 시 기존 세션 만료)</li>
            </ul>
          ),
        },
        {
          title: "카메라 및 미디어 접근",
          body: (
            <p>
              모바일 앱에서 카메라 및 사진 라이브러리 접근 권한을 요청할 수
              있습니다. 이는 칸막이 실내 공간 촬영 및 기존 사진 선택을 위한
              목적으로만 사용되며, 촬영·선택된 이미지는 렌더링 처리 후 서버에
              저장되지 않습니다. 이용자는 언제든지 OS 설정에서 권한을 철회할 수
              있습니다.
            </p>
          ),
        },
        {
          title: "만 14세 미만 아동의 개인정보",
          body: (
            <p>
              서비스는 만 14세 미만 아동의 회원가입을 받지 않습니다. 서비스는
              실내 인테리어 전문가를 대상으로 하는 B2B 도구이며, 만 14세 미만
              아동이 가입한 것이 확인되는 경우 즉시 해당 계정을 삭제하고 개인정보를
              파기합니다.
            </p>
          ),
        },
        {
          title: "개인정보의 국외 이전",
          body: (
            <p>
              서비스는 인프라 운영을 위해 아래 해외 클라우드 사업자를 이용할 수
              있습니다.
              <br />
              <br />
              <strong>이전받는 자:</strong> Supabase Inc. (데이터베이스·스토리지),
              Vercel Inc. (웹·API 호스팅)
              <br />
              <strong>이전 국가:</strong> 대한민국(ap-northeast-2), 미국 등
              <br />
              <strong>이전 항목:</strong> 회원 가입 정보, 결제 기록, 접속 로그
              <br />
              <strong>이전 방법:</strong> 네트워크를 통한 전송 (HTTPS 암호화)
              <br />
              <strong>보유 기간:</strong> 본 방침의 보유 기간과 동일
            </p>
          ),
        },
        {
          title: "쿠키 및 로컬스토리지 사용",
          body: (
            <p>
              로그인 세션 유지를 위해 이용자의 기기에 다음 정보를 저장합니다.
              <br />
              <br />
              <strong>로컬스토리지:</strong>
              <ul className="list-disc pl-5 mt-1">
                <li><code>auth_token</code> — 로그인 인증 토큰 (로그아웃 시 삭제)</li>
                <li><code>auth_user</code> — 이름/역할 등 세션 표시용 메타</li>
                <li><code>device_id</code> — 단일 세션 관리용 기기 식별자</li>
                <li><code>camera_intro_ack</code> — 카메라 권한 안내 확인 여부</li>
              </ul>
              <br />
              브라우저 설정에서 언제든지 삭제할 수 있으며, 삭제 시 자동 로그아웃
              됩니다.
            </p>
          ),
        },
        {
          title: "개인정보 보호책임자",
          body: (
            <p>
              <strong>성명:</strong> 칸막이Go 개인정보 보호책임자
              <br />
              <strong>연락처:</strong>{" "}
              <a href="mailto:privacy@kanmakigo.com" className="text-[#d43e76] underline">
                privacy@kanmakigo.com
              </a>
            </p>
          ),
        },
        {
          title: "권익침해 구제방법",
          body: (
            <p>
              개인정보 침해로 인한 신고·상담은 아래 기관에 문의할 수 있습니다.
              <br />
              <br />
              <strong>개인정보침해신고센터 (KISA)</strong> · ☎ 118 ·{" "}
              <a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer" className="text-[#d43e76] underline">
                privacy.kisa.or.kr
              </a>
              <br />
              <strong>개인정보 분쟁조정위원회</strong> · ☎ 1833-6972 ·{" "}
              <a href="https://www.kopico.go.kr" target="_blank" rel="noreferrer" className="text-[#d43e76] underline">
                kopico.go.kr
              </a>
              <br />
              <strong>대검찰청 사이버수사과</strong> · ☎ 1301
              <br />
              <strong>경찰청 사이버수사국</strong> · ☎ 182
            </p>
          ),
        },
        {
          title: "개정 이력",
          body: (
            <ul className="list-disc pl-5 space-y-1.5">
              <li>2026-04-19 — 최초 제정</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
