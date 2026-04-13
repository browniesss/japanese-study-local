# Oracle VM 배포

이 프로젝트는 Oracle Always Free VM 한 대에 그대로 올릴 수 있도록 서버 골격을 포함합니다.

## 포함된 것

- `server/app.mjs`
  - 정적 파일 서빙
  - `/api/health`
  - `/api/bootstrap`
  - `/api/progress`
- `server/progress-store.mjs`
  - SQLite 기반 진행도 저장
  - `nickname + device token` 구조
- `scripts/oracle/cloud-init.yaml`
  - VM 부팅 시 앱 자동 설치/빌드/서비스 등록
- `scripts/oracle/provision-vm.ps1`
  - OCI CLI로 Always Free VM 생성

## 이 구조를 추천하는 이유

- Oracle Always Free VM만 있으면 됨
- 별도 DB 인프라를 추가로 붙이지 않아도 됨
- 내부 스터디용 규모에서는 SQLite면 충분함
- 닉네임 + 내부 토큰 저장 흐름이 이미 앱에 연결돼 있음

## 사용자에게 남는 일

완전 0단계는 아닙니다. 아래는 한 번은 직접 해야 합니다.

1. Oracle Cloud 계정 준비
2. OCI CLI 설치
3. `oci setup config` 또는 API 키 업로드/설정
4. 사용할 `CompartmentId`, `AvailabilityDomain`, `SubnetId`, `ImageId` 확인
5. 배포할 Git 저장소 URL 준비

그 이후는 PowerShell 스크립트로 대부분 자동화할 수 있습니다.

## 실제 실행 예시

```powershell
pwsh ./scripts/oracle/provision-vm.ps1 `
  -CompartmentId "ocid1.compartment.oc1..." `
  -AvailabilityDomain "xxxx:AP-CHUNCHEON-1-AD-1" `
  -SubnetId "ocid1.subnet.oc1..." `
  -ImageId "ocid1.image.oc1..." `
  -SshPublicKeyPath "$env:USERPROFILE\\.ssh\\id_ed25519.pub" `
  -AppGitUrl "https://github.com/your-account/japanese-study-local.git" `
  -AppGitRef "main"
```

스크립트가 끝나면 `APP_URL=http://.../` 를 출력합니다.

## 서버 실행 방식

VM 안에서는 systemd 서비스가 아래 명령으로 앱을 실행합니다.

```bash
node server/app.mjs
```

기본 포트는 `80` 입니다.

## 저장 위치

진행도는 VM 내부 SQLite 파일에 저장됩니다.

- 기본 경로: `/opt/japanese-study/app/var/study-progress.sqlite`

## 한계

- VM이 회수되거나 디스크가 초기화되면 데이터가 사라질 수 있습니다.
- 장기 보존이 중요하면 다음 단계에서 Oracle Autonomous Database로 옮기는 편이 낫습니다.
- 현재 스크립트는 기존 VCN/서브넷이 준비돼 있다는 전제입니다.
