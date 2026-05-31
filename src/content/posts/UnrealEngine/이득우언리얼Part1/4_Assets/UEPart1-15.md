---
title: '[UE5/System] 15. Module & Plugin'
published: 2026-02-14
description: '언리얼 에디터 동작 방식, 모듈 시스템 기반 소스코드 구성 및 플러그인 구조 학습'
tags: [Unreal Engine, C++, Build System, Module, Plugin]
category: 'Unreal Engine'
draft: true 
lang: 'ko'
---

## 강의 목표
* 언리얼 엔진의 프로젝트 구성과 에디터 동작 방식 이해
* 언리얼 엔진의 모듈 시스템을 기반으로 한 소스 코드 구성 방법 학습
* 언리얼 플러그인 시스템을 활용한 효과적인 모듈 구성 파악

---

## 1. 언리얼 프로젝트 및 에디터 구성

### 1.1. 언리얼 에디터와 게임 빌드
* **에디터 (Editor):** 게임 제작을 위해 에픽게임즈가 제공하는 저작 도구(응용 프로그램).
* **게임 빌드 (Game Build):** EXE 파일과 리소스로 구성되어 독립적으로 동작하는 최종 게임 클라이언트.
* **특징:** 게임 개발 작업을 위해 폴더와 파일 이름 규칙이 사전에 엄격하게 설정되어 있으며, 이 규칙을 반드시 준수해야 함.



### 1.2. 언리얼 에디터의 실행 파이프라인
프로젝트의 `.uproject` 파일을 실행했을 때 에디터가 열리는 과정은 다음과 같다.
1. `.uproject` 파일 더블클릭 (윈도우 레지스트리에 확장자 연결됨).
2. **UnrealVersionSelector** 프로그램 호출 (오픈소스, 에픽게임즈 GitHub에서 확인 가능).
3. `.uproject` 내부의 JSON 데이터를 읽어 지정된 엔진 버전(예: `"EngineAssociation": "5.1"`) 파악.
4. `ProgramData/Epic/UnrealLauncher` 폴더의 JSON을 참조하여 해당 버전의 엔진 경로 탐색 후 에디터 실행.

### 1.3. 주요 폴더 구조
빈 폴더에 `.uproject` 파일을 수동으로 만들고 실행하면 다음 폴더들이 자동 생성된다.
* **Config:** 프로젝트 설정 정보 보관.
* **Content:** 에셋(Asset) 보관.
* **DerivedDataCache:** (삭제 가능) 에셋 주요 정보 로딩 속도 향상을 위한 임시 캐시 데이터.
* **Intermediate:** (삭제 가능) 소스 코드 컴파일 및 빌드 과정에서 생성되는 임시 중간 결과물.
* **Saved:** (삭제 가능) 에디터 세팅, 자동 저장 파일, 로그 등 보관.

---

## 2. 블루프린트 프로젝트 vs C++ 프로젝트

* **블루프린트 프로젝트:** C++ 코드 없이 언리얼 엔진이 기본 제공하는 기능(모듈)만 상속받아 시각적 스크립팅으로 로직을 구현.
* **C++ 프로젝트:** 언리얼 엔진 기본 모듈에 **개발자가 직접 작성한 커스텀 C++ 모듈을 추가**하여 사용하는 프로젝트. 
  * 구조: `언리얼 엔진 C++ 모듈` ⬅️ `개발자 C++ 모듈` ⬅️ `블루프린트 로직`

---

## 3. 언리얼 C++ 모듈 시스템

언리얼 엔진의 모든 소스 코드는 **모듈(Module)** 단위로 구성된다.
* **컴파일 결과물:**
  * **에디터용 빌드:** DLL 동적 라이브러리 (규칙: `UnrealEditor-{모듈이름}.DLL`)
  * **게임용 빌드:** 정적 라이브러리
* **커스텀 모듈 추가 방법:**
  1. 컴파일된 에디터 모듈(DLL)을 `Binaries/Win64` 폴더에 배치.
  2. `UnrealEditor.modules` 파일에 빌드된 모듈 목록 갱신.
  3. `.uproject` 파일의 `"Modules"` 배열에 해당 모듈 이름과 타입(`Runtime` 등) 명시 후 실행.

---

## 4. 소스 코드 관리와 UBT (Unreal Build Tool)

언리얼은 멀티 플랫폼 빌드를 지원하기 위해 Visual Studio 같은 특정 IDE에 종속되지 않습니다. 실제 빌드는 **UBT (Unreal Build Tool)** 라는 C# 프로그램이 담당



`소스 코드 (Source 폴더)` ➡ `UBT (C# 프로그램)` ➡ `각 플랫폼별 컴파일러 실행 (Windows, Mac, Linux 등)`

### 4.1. Source 폴더 구조 및 C# 설정 파일
모듈을 구성하려면 타겟 설정 파일과 모듈 설정 파일이 필요합니다. C#의 동적 컴파일(compile on-the-fly)을 활용해 빌드 환경을 구축

* **Target 설정 파일 (`.Target.cs`):** 전체 솔루션의 빌드 대상 및 환경 설정.
  * `{프로젝트명}.Target.cs` (게임 빌드용)
  * `{프로젝트명}.Editor.Target.cs` (에디터 빌드용)
* **Module 설정 파일 (`.Build.cs`):** 특정 모듈의 컴파일 옵션, 외부 헤더/라이브러리 의존성 설정.

### 4.2. 설정 파일 작성 실습 (UE 5.7 기준)

**1) Editor 타겟 파일 (`UnrealBuildSystemEditor.Target.cs`)**
```csharp
using UnrealBuildTool;
using System.Collections.Generic;

public class UnrealBuildSystemEditorTarget : TargetRules
{
    public UnrealBuildSystemEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V6;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_7;
        CppStandard = CppStandardVersion.Cpp20; // UE 5.7부터 C++20 지원
        
        // 엔진과 공유하는 빌드 환경 분리 (Epic 런처 버전 엔진 사용 시 필요)
        bOverrideBuildEnvironment = true; 

        ExtraModuleNames.AddRange(new string[] { "UnrealBuildSystem" });
    }
}