// component 모듈의 공개 진입점. 다른 core 폴더는 이 파일을 통해 불러온다. (Phase 1 문서 3.5)
export { createElement } from './createElement.js';
export { FunctionComponent } from './FunctionComponent.js';
export { findCurrentComponent, HOOK_ORDER_CHANGED_MESSAGE } from './hookContext.js';
