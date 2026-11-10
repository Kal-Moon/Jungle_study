// useEffect, useMemo가 같이 쓰는 의존성 배열 규칙. (Phase 2 문서 7.2, 7.3, 8장)
// 비교 기준을 바꾸려면 이 파일만 고친다.

/**
 * 의존성 배열이 생략(undefined)되었거나 배열인지 확인한다.
 * @param {string} hookName 에러 메시지에 쓸 Hook 이름
 * @param {*} dependencies 확인할 값
 * @returns {void}
 * @throws {TypeError} undefined도 배열도 아닐 때
 */
export function assertDependencies(hookName, dependencies) {
  if (dependencies !== undefined && !Array.isArray(dependencies)) {
    throw new TypeError(`[${hookName}] 의존성은 배열이어야 합니다`);
  }
}

/**
 * 의존성이 바뀌었는지 판단한다.
 * 어느 쪽이든 생략(undefined)되었거나, 길이가 다르거나, 하나라도 Object.is가 false면 바뀐 것이다.
 * @param {any[] | undefined} previousDependencies 지난번에 저장한 의존성
 * @param {any[] | undefined} nextDependencies 이번 렌더링의 의존성
 * @returns {boolean} 바뀌었으면 true
 */
export function isDepsChanged(previousDependencies, nextDependencies) {
  if (previousDependencies === undefined || nextDependencies === undefined) {
    return true;
  }

  if (previousDependencies.length !== nextDependencies.length) {
    return true;
  }

  return nextDependencies.some((dependency, i) => !Object.is(previousDependencies[i], dependency));
}

/**
 * 저장할 의존성을 복사한다. 호출한 쪽이 배열을 나중에 고쳐도 비교 기준이 바뀌지 않게 한다.
 * @param {any[] | undefined} dependencies 이번 렌더링의 의존성
 * @returns {any[] | undefined} 복사한 배열 (생략이면 undefined)
 */
export function copyDependencies(dependencies) {
  return dependencies === undefined ? undefined : [...dependencies];
}
