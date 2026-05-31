---
title: '[UE5/System] 14. Package & Asset'
published: 2026-02-13
description: 'UPackage를 이용한 에셋 저장과 LoadObject, FStreamableManager를 활용한 다양한 로딩 방법'
image: '' 
tags: [Unreal Engine, C++]
category: 'Unreal Engine'
draft: true 
lang: 'ko'
---

> "이득우의 언리얼 프로그래밍 Part1 - 언리얼 C++의 이해" 학습 내용을 정리한 강의 노트입니다.   
> 옵시디언에 정리한 마크다운 문서라 블로그 마크다운 양식에 일부 맞지 않을 수 있습니다.   
>

# 1. 강의 목표

- 언리얼 에셋과 이를 포장하는 **패키지(Package)** 의 개념 이해
- 언리얼 에디터에서 볼 수 있도록 에셋을 저장하고 불러오는 방법 학습
- **오브젝트 패스(Object Path)** 를 사용하여 다양한 방식으로 에셋을 로딩하는 방법 이해

---

# 2. 핵심 이론

## 2.1. 패키지(Package)란?

단일 오브젝트가 아닌, **계층 구조를 가진 복잡한 언리얼 오브젝트들**을 효과적으로 저장하고 관리하기 위한 단위로 언리얼 엔진은 `UPackage` 단위로 오브젝트를 관리한다.

> **패키지의 중의적 의미**
> 1. **래퍼(Wrapper):** 언리얼 오브젝트를 감싼 포장 오브젝트 (이번 강의 주제)
> 2. **배포(Packaging):** 개발된 최종 콘텐츠를 실행 파일로 만드는 작업 (예: 게임 패키징)
> 3. **DLC:** 향후 확장 콘텐츠에 사용되는 별도 데이터 묶음 (예: .pak 파일)
> 
> 

## 2.2. 패키지와 에셋(Asset)의 관계

- **패키지 (`UPackage`):** 다수의 언리얼 오브젝트를 포장하는 최상위 언리얼 오브젝트 (모든 언리얼 오브젝트는 특정 패키지에 소속됨)
- **에셋 (Asset):** 패키지의 서브 오브젝트 중 **에디터에 노출되는 주요 오브젝트**
  - 구조상 패키지는 다수의 에셋을 가질 수 있으나, 일반적으로는 **1개의 패키지에 1개의 메인 에셋**을 가진다.
- **서브 오브젝트:** 에셋 하위에 포함된 오브젝트들로, 에디터에는 직접 노출되지 않지만 패키지 내부에 포함된다.

**[계층 구조]**

```text
UPackage (패키지)
 └─ Asset (에셋 - 에디터에 보임)
     ├─ SubObject 1
     └─ SubObject 2 ...
```

---

# 3. 실습: 패키지 저장 및 로드

직렬화(Serialization)를 넘어, 에디터가 인식할 수 있는 `.uasset` 형태로 데이터를 저장하고 불러와보자

## 3.1. 헤더 파일 (`MyGameInstance.h`)

패키지 저장/로드 함수와 비동기 로딩을 위한 `FStreamableManager`를 선언

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "Engine/StreamableManager.h" // 비동기 로딩 관리자
#include "MyGameInstance.generated.h"

UCLASS()
class UNREALSERIALIZATION_API UMyGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	UMyGameInstance();

	virtual void Init() override;

	// 패키지 저장 및 로드 테스트 함수
	void SaveStudentPackage() const;
	void LoadStudentPackage() const;

	// 오브젝트 직접 로드 테스트 함수
	void LoadStudentObject() const;

private:
	// 패키지 이름과 에셋 이름 상수
	static const FString PackageName;
	static const FString AssetName;

	UPROPERTY()
	TObjectPtr<class UStudent> StudentSrc;

	// 비동기 로딩을 위한 관리자와 핸들
	FStreamableManager StreamableManager;
	TSharedPtr<FStreamableHandle> Handle;
};

```

## 3.2. 구현 파일 (`MyGameInstance.cpp`)

### 상수 정의 및 초기화

```cpp
#include "MyGameInstance.h"
#include "Student.h"
#include "UObject/SavePackage.h" // 패키지 저장 기능

// 패키지 경로: /Game은 콘텐츠 폴더를 의미
const FString UMyGameInstance::PackageName = TEXT("/Game/Student");
const FString UMyGameInstance::AssetName = TEXT("TopStudent");

void UMyGameInstance::Init()
{
	Super::Init();
    // (이전 시간의 직렬화 실습 코드는 생략...)
    
	SaveStudentPackage();
	LoadStudentPackage();
    LoadStudentObject();
}

```

### 패키지 저장 (`SaveStudentPackage`)

언리얼 오브젝트를 생성하고 패키지로 묶어 `.uasset` 파일로 저장한다.

```cpp
void UMyGameInstance::SaveStudentPackage() const
{
	// 1. 기존 패키지가 있다면 로드 (FullyLoad)
	UPackage* StudentPackage = ::LoadPackage(nullptr, *PackageName, LOAD_None);
	if (StudentPackage)
	{
		StudentPackage->FullyLoad();
	}

	// 2. 패키지 생성
	StudentPackage = CreatePackage(*PackageName);

	// 3. 저장 옵션 설정 (공개, 독립 실행형)
	EObjectFlags ObjectFlag = RF_Public | RF_Standalone;

	// 4. 패키지 내부에 에셋(TopStudent) 생성
    // NewObject의 Outer를 StudentPackage로 지정
	UStudent* TopStudent = NewObject<UStudent>(StudentPackage, UStudent::StaticClass(), *AssetName, ObjectFlag);
	TopStudent->SetName(TEXT("홍길동"));
	TopStudent->SetOrder(36);

	// 5. 에셋 내부에 서브 오브젝트 생성 (10개)
	for (int32 ix = 0; ix < 10; ++ix)
	{
		FString SubObjectName = FString::Printf(TEXT("Student%d"), ix);
		UStudent* SubStudent = NewObject<UStudent>(TopStudent, UStudent::StaticClass(), *SubObjectName, ObjectFlag);
		SubStudent->SetName(FString::Printf(TEXT("서브학생%d"), ix));
		SubStudent->SetOrder(ix);
	}

	// 6. 패키지 파일 저장 (.uasset)
	const FString PackageFileName = FPackageName::LongPackageNameToFilename(PackageName, FPackageName::GetAssetPackageExtension());
	
    FSavePackageArgs SaveArgs;
	SaveArgs.TopLevelFlags = ObjectFlag;

	if (UPackage::SavePackage(StudentPackage, nullptr, *PackageFileName, SaveArgs))
	{
		UE_LOG(LogTemp, Log, TEXT("학생 패키지 저장 성공 : %s"), *PackageFileName);
	}
}

```

> **참고:** UE 5.4 버전부터는 에셋 생성이 Factory 클래스를 통해서만 가능하도록 정책이 변경되는 추세입니다. 위 코드로 저장 시 콘텐츠 브라우저에 바로 보이지 않을 수 있으나, 파일 시스템에는 정상적으로 저장됩니다.

### 패키지 로드 (`LoadStudentPackage`)

저장된 패키지를 불러와 내부의 에셋을 찾는다.

```cpp
void UMyGameInstance::LoadStudentPackage() const
{
	// 1. 패키지 로드
	UPackage* LoadedPackage = ::LoadPackage(nullptr, *PackageName, LOAD_None);
	if (nullptr == LoadedPackage)
	{
		UE_LOG(LogTemp, Warning, TEXT("학생 패키지 로드 실패"));
		return;
	}

	// 2. 패키지 내부 에셋 모두 로드
	LoadedPackage->FullyLoad();

	// 3. 패키지 내에서 특정 에셋 찾기 (FindObject)
	UStudent* TopStudent = FindObject<UStudent>(LoadedPackage, *AssetName);
	
	if (TopStudent)
	{
		PrintStudentInfo(TopStudent, TEXT("LoadedPackage"));
	}
}

```

---

# 4. 에셋 로딩 전략과 오브젝트 패스

게임 제작 시 모든 에셋을 직접 참조(Hard Reference)하면 메모리 부하가 크다. 이를 해결하기 위해 **오브젝트 패스(문자열)** 를 사용하여 필요할 때 로딩하는 전략을 사용한다.

## 4.1. 오브젝트 패스 (Object Path)

- 패키지 이름과 에셋 이름을 조합한 유일한 문자열 경로
- 형식: `패키지명.에셋명` (예: `/Game/Student.TopStudent`)
- 이 문자열을 Key로 사용하여 에셋을 로드할 수 있습니다.

## 4.2. 로딩 방식 3가지

### ① 런타임 동기 로딩 (`LoadObject`)

게임 실행 중(런타임)에 필요한 시점에 즉시 로딩

```cpp
void UMyGameInstance::LoadStudentObject() const
{
    // 경로 문자열 조합
	const FString TopSoftObjectPath = FString::Printf(TEXT("%s.%s"), *PackageName, *AssetName);

    // LoadObject 함수로 로딩
	UStudent* TopStudent = LoadObject<UStudent>(nullptr, *TopSoftObjectPath);
	PrintStudentInfo(TopStudent, TEXT("LoadObject Asset"));
}

```

### ② 생성자 로딩 (`ConstructorHelpers`)

C++ 클래스 생성자에서 미리 에셋을 로딩하여 연결 (주로 컴포넌트나 기본 리소스 설정 시 사용)

```cpp
UMyGameInstance::UMyGameInstance()
{
	const FString TopSoftObjectPath = FString::Printf(TEXT("%s.%s"), *PackageName, *AssetName);
    
    // 생성자 전용 헬퍼 클래스 사용
	static ConstructorHelpers::FObjectFinder<UStudent> UASSET_TopStudent(*TopSoftObjectPath);
	if (UASSET_TopStudent.Succeeded())
	{
		PrintStudentInfo(UASSET_TopStudent.Object, TEXT("Constructor"));
	}
}

```

> **주의:** 생성자 로딩은 에디터 실행 시점에 호출되며, 실패 시 크래시가 발생할 수 있으므로 경로 확인이 중요합니다.

### ③ 런타임 비동기 로딩 (`StreamableManager`)

게임 흐름을 멈추지 않고 백그라운드에서 로딩. 로딩이 완료되면 델리게이트(콜백)를 호출

```cpp
// Init() 내부 등에서 호출
{
	const FString TopSoftObjectPath = FString::Printf(TEXT("%s.%s"), *PackageName, *AssetName);
    
    // 비동기 로드 요청
	Handle = StreamableManager.RequestAsyncLoad(TopSoftObjectPath,
		[&]()
		{
            // 로딩 완료 후 실행될 람다 함수
			if (Handle.IsValid() && Handle->HasLoadCompleted())
			{
				UStudent* TopStudent = Cast<UStudent>(Handle->GetLoadedAsset());
				if (TopStudent)
				{
					PrintStudentInfo(TopStudent, TEXT("AsyncLoad"));
                    
                    // 핸들 해제
					Handle->ReleaseHandle();
					Handle.Reset();
				}
			}
		}
	);
}

```

---

# 5. 정리

1. **패키지(Package)**: 언리얼 오브젝트들을 관리하고 저장하는 단위 (`UPackage`).
2. **에셋(Asset)**: 패키지 내부에 포함된 오브젝트 중 에디터에 노출되는 메인 오브젝트.
3. **오브젝트 패스**: 에셋의 고유한 문자열 경로 (`/Game/Folder/Asset.Asset`).
4. **로딩 전략**
    - **강참조(Hard Ref):** 직접 포인터로 참조 (메모리에 즉시 로드).
    - **약참조(Soft Ref):** 경로 문자열로 참조해두고 필요할 때 로드.
    - **동기 로딩:** `LoadObject` (즉시 로딩, 렉 유발 가능).
    - **비동기 로딩:** `StreamableManager` (백그라운드 로딩, 대규모 게임 필수).

---
