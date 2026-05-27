---
title: '[UE5 TPS] 0. 개발 환경 구축 및 초기 설정'
published: 2026-04-02
description: 'UE5.7기준 개발 환경 구축과 데디케이티드 서버, GAS, Enhanced Input 등을 고려한 초기 설정을 해보자'
image: ''
tags: [Unreal Engine, C++, Dedicated Server, GAS]
category: 'UE5 TPS'
draft: true 
lang: 'ko'
---

언리얼 프로젝트를 개발하기 전에 데디케이티드 서버(Dedicated Server) 구조를 상정하고 GAS(Gameplay Ability System)를 핵심 아키텍처로 가져가는 환경을 구축하던 과정을 정리하였다.

## 1. 데디케이티드 서버 빌드 타겟과 로그 설정

언리얼 엔진의 기본 템플릿은 에디터와 클라이언트 빌드만 제공한다. 서버 전용 로직을 검증하기 위해 별도의 `.Target.cs` 설정이 필요하다.

일반적으로 `Shipping` 빌드에서는 성능 최적화를 위해 모든 로그가 제거된다. 하지만 데디케이티드 서버 운영 중 발생하는 예외 상황을 추적하기 위해서는 로그가 필요하다. 이를 위해 서버 타겟 설정에서 명시적으로 로그를 활성화해야 한다.

```csharp
// CoopGameServer.Target.cs
public class CoopGameServerTarget : TargetRules
{
    public CoopGameServerTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Server; // 타입 Server로 변경
        DefaultBuildSettings = BuildSettingsVersion.V6;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_7;

        ExtraModuleNames.Add("CoopGame");

        // 1. 서버는 당연히 Development빌드가 아니라 Shipping빌드를 한다.
        // 2. Shipping빌드는 로그가 남지 않아 디버깅이 어렵다.
        // 3. 그래서 Shipping빌드에서도 로그가 남도록 설정한다.
        bUseLoggingInShipping = true;
    }
}
```
![alt text](image-1.png)
![alt text](image.png)

타겟 파일을 추가하거나 수정했을 때는 반드시 `.uproject` 파일 우클릭 후 `Generate Visual Studio project files`를 실행해야 프로젝트 탐색기에 정상적으로 반영된다.

---

## 2. 버전 관리 시스템 (Git) 환경 설정

- .gitignore 설정
```git
# Unreal Engine
Binaries/
Build/
DerivedDataCache/
Intermediate/
Saved/
*.VC.db
*.opensdf
*.opendb
*.sdf
*.sln
*.suo
*.xcodeproj
*.xcworkspace

# 단, 이것들은 추적
!Config/
!Content/
!Source/
!Plugins/
!*.uproject

# Visual Studio
# .sln은 Generate Visual Studio project files로 언제든 재생성 가능하므로 추적할 필요 없다.
.vs/
*.sln
*.suo
*.user
*.userosscache
*.sln.docstates
*.VC.db
*.VC.VC.opendb

# Visual Studio Code
.vscode/

# Rider (혹시 나중에 쓸 경우 대비)
.idea/
```

- LFS (.gitattributes)

```bash
*.uasset filter=lfs diff=lfs merge=lfs -text
*.umap filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.fbx filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.ttf filter=lfs diff=lfs merge=lfs -text
```

---

## 3. GAS(Gameplay Ability System) 디버깅 환경

콘솔 창(`~`)에서 `ShowDebug AbilitySystem` 명령어를 입력했을 때, 현재 캐릭터가 가진 태그, 이펙트, Attribute(체력, 마나 등)을 오버레이로 확인하기 위해 `DefaultGame.ini`에 다음 설정을 추가했다.

```ini
; 콘솔 창(~ 키 입력)열고, "ShowDebug abilitysystem" 입력
; 화면에 GAS 관련 정보 (현재 가진 태그, 이펙트, 체력, 마나 등 Attribute) 오버레이 표시
[/Script/GameplayAbilities.AbilitySystemGlobals]
bUseDebugTargetFromHud=true
```

---

## 4. Enhanced Input: WASD 이동 로직 재구성

UE5의 Enhanced Input은 유연하지만, 2D Axis 기반의 입력 처리 시 축 변환(Swizzle)과 반전(Negate)의 개념을 정확히 적용해야 한다. 

엔진은 기본적으로 모든 입력을 '오른쪽(X+)' 기준으로 받는다. 따라서 `IA_Move` (Axis2D) 액션 하나로 방향을 제어하려면 다음과 같은 Modifiers 세팅이 필요하다.

* **W (위):** `Swizzle Input Axis Values` (입력을 Y축으로 변환, 이때 XYZ -> YXZ 설정 필요)
* **S (아래):** `Swizzle Input Axis Values` + `Negate` (Y축으로 변환, 이때 XYZ -> YXZ 설정 필요. 그 후 반전)
* **D (오른쪽):** 모디파이어 없음 (기본 X축 양수)
* **A (왼쪽):** `Negate` (X축 반전)

---

## 5. C++ 플레이어 캐릭터 클래스 설계

기본 템플릿의 `BP_ThirdPersonCharacter`를 재사용하거나 블루프린트 에셋 경로를 하드코딩하는 방식 대신, BP가 상속받는 기반이 되는 C++ 클래스(`ACoopGameCharacter`)를 직접 구현한다.   

카메라 세팅, 이동 컴포넌트 처리, Enhanced Input의 IMC(Input Mapping Context) 바인딩과 같은 로직은 C++에서 담당.   

이를 상속받은 BP에서는 메쉬나 애니메이션 블루프린트(AnimBP) 등 시각적 에셋만 할당하여 로직과 에셋을 분리한다.

---

> 새로운 입력(단축키, 액션 등)을 추가하는 과정을 순서대로 정리하면 아래와 같다.

1. **IA 에셋 생성:** 언리얼 에디터에서 `IA_Jump`와 같은 Input Action(IA) 에셋을 만든다.
2. **IMC 매핑:** `IMC_Default`에 생성한 IA를 추가하고 입력 키를 매핑한다. (필요시 Modifiers나 Triggers 세팅)
3. **.h 변수 노출:** 헤더(`.h`) 파일에서 `UPROPERTY`를 사용해 블루프린트에 에셋을 연결할 수 있도록 슬롯을 열어준다.
4. **.cpp 바인딩 및 구현:** 소스(`.cpp`) 파일에 실제 동작할 함수를 구현하고, `BindAction`을 통해 IA와 함수를 묶어준다.
5. **BP 할당:** C++ 클래스를 상속받은 캐릭터 블루프린트를 열고, 노출된 슬롯에 만들어둔 IMC와 IA 에셋을 할당한다.

---

이때 클래스 헤더에 컴포넌트나 에셋 참조를 선언할 때 사용하는 `UPROPERTY` 매크로는 유니티의 `[SerializeField]` 특성(Attribute)와 유사하다. 인스펙터(디테일 패널)에 변수를 노출하고 값을 직렬화하여 저장할 수 있게 해준다.

```cpp
UPROPERTY(EditAnywhere, Category = "Input")
class UInputMappingContext* DefaultMappingContext;
```

참고로 괄호 안에 `EditAnywhere` 같은 지정자(Specifier)를 넣지 않고 빈 `UPROPERTY()`만 선언하면 BP나 에디터에 노출되지 않는다. (GC에 의해 임의로 제거될 수도 있다는걸 조심하자)




---
---


---
title: '[UE5 TPS] 1. 네트워크 기초 설계 및 세션 시스템'
published: 2026-04-03
description: '언리얼 서버 콘솔에 클라이언트가 접속하는 테스트 환경을 만들어보자'
image: ''
tags: [Unreal Engine, C++, Dedicated Server]
category: 'UE5 TPS'
draft: false 
lang: 'ko'
---


## 1. 언리얼 엔진 네트워크 모델 이해

코드 작성 전, 언리얼의 리플리케이션(Replication) 관련 개념을 일부 정리했다.

### 서버-클라이언트 구조
* **[Dedicated Server]:** 게임 로직의 모든 권위(Authority)를 가진다. 화면을 렌더링하지 않으며, 오직 게임 상태만 관리하고 이를 클라이언트에 복제(Replicate)한다.
* **[Client]:** 플레이어의 입력을 서버로 전송하고, 서버로부터 받은 상태를 화면에 렌더링하는 역할만 수행한다.

### Actor의 3가지 네트워크 역할 (Role)

| Role | 설명 | 위치 |
| :--- | :--- | :--- |
| **ROLE_Authority** | 이 Actor의 실제 주인. 핵심 로직의 실행 권한을 가짐. | 서버 |
| **ROLE_AutonomousProxy** | 로컬 플레이어가 직접 조종하는 Actor. | 클라이언트 (본인) |
| **ROLE_SimulatedProxy** | 다른 플레이어의 Actor를 복제해서 보여주는 형태. | 클라이언트 (타인) |

**예시**
```cpp
// 서버에서만 실행해야 하는 로직 (데미지 처리, 아이템 드롭 등)
if (HasAuthority()) { ... }

// 로컬 플레이어에서만 실행해야 하는 로직 (카메라 효과, HUD 등 UI 처리)
if (IsLocallyControlled()) { ... }
```

---

## 2. 주요 프레임워크 클래스 설계

네트워크 상에서 각 클래스가 어디에 존재하고 무슨 역할을 하는지 정의한다.

| 클래스 | 존재 위치 | 역할 |
| :--- | :--- | :--- |
| **AGameMode** | 서버 전용 | 게임 룰, 플레이어 입장/퇴장, 캐릭터 스폰 제어 |
| **AGameState** | 서버 + 전체 클라이언트 | 게임 전체의 상태 (타이머, 팀 점수, 접속자 수 등) |
| **APlayerState** | 서버 + 전체 클라이언트 | 개별 플레이어의 상태 (HP, 닉네임, 킬/데스 등) |
| **APlayerController** | 서버 + 해당 클라이언트 | 입력 처리 및 클라이언트-서버 간의 통신(RPC) 창구 |

### C++ 클래스 구현

**1. CoopGameMode (부모: AGameModeBase)**
플레이어의 접속 및 퇴장 로그를 서버에 기록한다.
```cpp
// CoopGameMode.cpp
#include "Core/CoopGameMode.h"
#include "Core/CoopGameState.h"
#include "Core/CoopPlayerState.h"

ACoopGameMode::ACoopGameMode()
{
    GameStateClass = ACoopGameState::StaticClass();
    PlayerStateClass = ACoopPlayerState::StaticClass();
}

void ACoopGameMode::PostLogin(APlayerController* NewPlayer)
{
    Super::PostLogin(NewPlayer);
    UE_LOG(LogTemp, Log, TEXT("Player Joined: %s"), *NewPlayer->GetName());
}

void ACoopGameMode::Logout(AController* Exiting)
{
    Super::Logout(Exiting);
    UE_LOG(LogTemp, Log, TEXT("Player Left: %s"), *Exiting->GetName());
}
```

**2. CoopGameState (부모: AGameStateBase)**
접속 중인 플레이어 수를 서버 권위로 관리하고 클라이언트에 복제한다.
```cpp
// CoopGameState.h
UPROPERTY(Replicated, BlueprintReadOnly, Category = "Game")
int32 ConnectedPlayerCount;

// CoopGameState.cpp
void ACoopGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(ACoopGameState, ConnectedPlayerCount);
}
```

**3. CoopPlayerState (부모: APlayerState)**
추후 GAS(GameplayAbilitySystem)와 연동될 플레이어의 생존 여부 등을 관리한다.
```cpp
// CoopPlayerState.h
UPROPERTY(Replicated, BlueprintReadOnly, Category = "Player")
bool bIsAlive;

// CoopPlayerState.cpp
void ACoopPlayerState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(ACoopPlayerState, bIsAlive);
}
```

**DefaultGame.ini 등록**
```ini
[/Script/EngineSettings.GameMapsSettings]
GlobalDefaultGameMode=/Script/CoopGame.CoopGameMode
```

---

## 3. 온라인 서브시스템 (OSS) 및 세션 구현

현재는 로컬 LAN 테스트를 위해 `NULL` 서브시스템을 사용하며, 추후 Steam OSS로 교체할 수 있는 구조로 설계한다.

### DefaultEngine.ini 설정
```ini
[OnlineSubsystem]
DefaultPlatformService=NULL

[OnlineSubsystemNULL]
bEnabled=true

[/Script/Engine.GameEngine]
+NetDriverDefinitions=(DefName="GameNetDriver",DriverClassName="OnlineSubsystemUtils.IpNetDriver",DriverClassNameFallback="OnlineSubsystemUtils.IpNetDriver")
```
*(에디터 Plugins에서 `Online Subsystem` 및 `Online Subsystem Utils` 활성화 필수)*

### GameInstance를 활용한 세션 관리
세션 로직은 씬 전환(Level Travel) 시에도 파괴되지 않고 살아남는 `UGameInstance`에 구현하는 것이 가장 안정적이다.

**CoopGameInstance.cpp (주요 로직 요약)**
```cpp
// 세션 생성
void UCoopGameInstance::CreateCoopSession(int32 MaxPlayers)
{
    // ... OSS 인터페이스 획득 생략 ...
    FOnlineSessionSettings SessionSettings;
    SessionSettings.bIsLANMatch = true; // NULL OSS 기준
    SessionSettings.NumPublicConnections = MaxPlayers;
    SessionSettings.bShouldAdvertise = true;
    
    SessionInterface->CreateSession(0, COOP_SESSION_NAME, SessionSettings);
}

// 세션 생성 성공 시 데디서버 레벨로 이동
void UCoopGameInstance::OnCreateSessionComplete(FName SessionName, bool bWasSuccessful)
{
    if (bWasSuccessful) {
        GetWorld()->ServerTravel("/Game/Levels/L_GameMap?listen");
    }
}

// 세션 참가 성공 시 클라이언트 이동
void UCoopGameInstance::OnJoinSessionComplete(FName SessionName, EOnJoinSessionCompleteResult::Type Result)
{
    if (Result == EOnJoinSessionCompleteResult::Success) {
        APlayerController* PC = GetFirstLocalPlayerController();
        FString TravelURL;
        if (SessionInterface->GetResolvedConnectString(SessionName, TravelURL)) {
            PC->ClientTravel(TravelURL, ETravelType::TRAVEL_Absolute);
        }
    }
}
```

---

## 4. 접속 테스트 및 검증

작성된 코드가 데디서버 환경에서 정상적으로 동작되는지 확인핮.

### 방법 1: 에디터 내 테스트 (PIE)
* **설정:** `Play As Listen Server`, `Number of Players: 2+`
* **결과:** 클라이언트 창이 2+ 개 생성되며 두 캐릭터가 동일 맵에서 동기화되는지 확인.

### 방법 2: 커맨드라인 데디서버 테스트
* **서버 실행:**
  `"UnrealEditor.exe" "[프로젝트경로]/CoopGame.uproject" /Game/Levels/L_GameMap -server -log`
* **클라이언트 실행:**
  `"UnrealEditor.exe" "[프로젝트경로]/CoopGame.uproject" 127.0.0.1 -game -log`
* **결과:** 서버 터미널에 `Player Joined` 로그가 정상적으로 출력되는지 확인.
![alt text](image-2.png)
