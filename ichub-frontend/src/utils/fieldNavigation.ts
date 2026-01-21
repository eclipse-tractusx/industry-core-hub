/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

// Small helper to scroll to an element, respect reduced-motion, optionally focus it,
// and add a temporary highlight class.
export type ScrollOptions = {
  element?: HTMLElement | null;
  selector?: string;
  container?: HTMLElement | null;
  focus?: boolean;
  highlightClass?: string;
  durationMs?: number;
  block?: 'center' | 'start' | 'nearest';
};

export function scrollToElement(options: ScrollOptions) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { cleanup: () => {} };
  }

  const {
    element = null,
    selector,
    container = null,
    focus = false,
    highlightClass = 'field-nav-highlight',
    durationMs = 3000,
    block = 'center'
  } = options || {};

  let target: HTMLElement | null = element || null;
  if (!target && selector) {
    try {
      target = document.querySelector(selector) as HTMLElement | null;
    } catch (err) {
      target = null;
    }
  }

  if (!target) return { cleanup: () => {} };

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll behavior: prefer built-in scrollIntoView when possible
  try {
    if (container && container instanceof HTMLElement) {
      // compute target position relative to container
      const elRect = target.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      const offset = elRect.top - contRect.top;
      const top = container.scrollTop + offset - (contRect.height / 2) + (elRect.height / 2);
      if (prefersReduced) {
        container.scrollTop = top;
      } else {
        container.scrollTo({ top, behavior: 'smooth' });
      }
    } else if (!prefersReduced && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block });
    } else if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block });
    }
  } catch (err) {
    // ignore
  }

  // Optionally focus the element if it's focusable
  if (focus) {
    try {
      // Only focus interactive elements
      const focusable = (target.tabIndex >= 0) || ['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(target.tagName);
      if (focusable) {
        (target as HTMLElement).focus({ preventScroll: true } as any);
      }
    } catch (err) {
      // ignore
    }
  }

  // After container-level scroll, ensure the element is visible in the viewport.
  try {
    const rect = target.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    if (!isVisible) {
      if (!prefersReduced && typeof target.scrollIntoView === 'function') {
        // small delay so container scroll finishes first
        setTimeout(() => {
          try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        }, 120);
      } else if (typeof target.scrollIntoView === 'function') {
        try { target.scrollIntoView({ block: 'center' }); } catch (e) {}
      }
    }
  } catch (err) {
    // ignore
  }

  // Add highlight class temporarily
  let removed = false;
  if (highlightClass) {
    // Prefer to highlight an inner value container (input/select/mui input root) instead of the full field wrapper
    const selectors = [
      '.MuiOutlinedInput-root',
      '.MuiInputBase-root',
      '.MuiSelect-root',
      'input',
      'textarea',
      'select',
      '.MuiSwitch-root',
      '.MuiCheckbox-root',
      '.MuiFormControlLabel-root',
      '.MuiChip-root',
      '.MuiCard-root',
      '[data-array-item]',
      '[data-section]',
      '[data-schema-card]'
    ];
    let highlightTarget: HTMLElement | null = null;
    for (const s of selectors) {
      const found = target.querySelector(s) as HTMLElement | null;
      if (found) { highlightTarget = found; break; }
    }
    // If navigating to a parent field (object/section) without a direct value, prefer the data-section or data-object container
    if (!highlightTarget || highlightTarget === target) {
      // Try to find a parent [data-section] or [data-object] container
      const sectionWrapper = target.closest('[data-section]') as HTMLElement | null;
      const objectWrapper = target.closest('[data-object]') as HTMLElement | null;
      if (sectionWrapper) {
        highlightTarget = sectionWrapper;
      } else if (objectWrapper) {
        highlightTarget = objectWrapper;
      } else {
        highlightTarget = target;
      }
    }

    // If there's an explicit boolean wrapper (label + switch) nearby, prefer it
    // so the whole attribute block is highlighted instead of just the inner control.
    let preferWrapper = false;
    try {
      // First try to find a boolean wrapper from the highlightTarget itself (covers case
      // where we selected an inner control like the switch). If not found, fall back to
      // the original target's ancestors.
      let booleanWrapper: HTMLElement | null = null;
      if (highlightTarget && (highlightTarget.closest as any)) {
        booleanWrapper = highlightTarget.closest('[data-boolean]') as HTMLElement | null;
      }
      if (!booleanWrapper && target && (target.closest as any)) {
        booleanWrapper = target.closest('[data-boolean]') as HTMLElement | null;
      }
      if (booleanWrapper) {
        // Prefer the inner child inside the boolean wrapper that contains the actual
        // switch/checkbox control. This excludes sibling elements like the info icon.
        // Find the immediate child of the booleanWrapper that contains the actual control.
        // This avoids selecting sibling columns (e.g. info icon column) as the highlight target.
        const children = Array.from(booleanWrapper.children) as HTMLElement[];
        let chosenChild: HTMLElement | null = null;
        for (const ch of children) {
          if (ch.querySelector('.MuiSwitch-root, .MuiCheckbox-root, .MuiFormControlLabel-root, input[type="checkbox"], input[type="radio"]')) {
            // If the immediate child contains the control but also contains other siblings
            // (like an info icon), prefer the direct child of this node that contains the control.
            const subChildren = Array.from(ch.children) as HTMLElement[];
            let directChildWithControl: HTMLElement | null = null;
            for (const sub of subChildren) {
              if (sub.querySelector('.MuiSwitch-root, .MuiCheckbox-root, .MuiFormControlLabel-root, input[type="checkbox"], input[type="radio"]')) {
                directChildWithControl = sub;
                break;
              }
            }
            chosenChild = directChildWithControl || ch;
            break;
          }
        }
        if (chosenChild) {
          highlightTarget = chosenChild;
          preferWrapper = true;
        } else {
          // Fallback: if no immediate child contains the control, try the previous approach
          const innerControl = booleanWrapper.querySelector('.MuiSwitch-root, .MuiCheckbox-root, .MuiFormControlLabel-root, input[type="checkbox"], input[type="radio"]') as HTMLElement | null;
          if (innerControl) {
            // Walk up until we hit a direct child of booleanWrapper
            let node: HTMLElement | null = innerControl;
            while (node && node.parentElement && node.parentElement !== booleanWrapper) {
              node = node.parentElement;
            }
            if (node && node.parentElement === booleanWrapper) {
              highlightTarget = node;
              preferWrapper = true;
            } else {
              highlightTarget = booleanWrapper;
              preferWrapper = true;
            }
          } else {
            highlightTarget = booleanWrapper;
            preferWrapper = true;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const animClass = 'field-nav-animatable';
    const hoverClass = 'field-nav-hover';
    // Ensure the element has the animatable class so transitions run both on add and remove
    highlightTarget.classList.add(animClass);
    highlightTarget.classList.add(highlightClass);

    // Also add the hover-like class to the nearest input/select root so the outline matches hover
    let hoverTarget: HTMLElement | null = null;
    try {
      // Include switch/checkbox and label wrappers so booleans receive the hover outline
      hoverTarget = (highlightTarget.closest && (highlightTarget.closest('.MuiOutlinedInput-root, .MuiInputBase-root, .MuiSelect-root, .MuiSwitch-root, .MuiCheckbox-root, .MuiFormControlLabel-root') as HTMLElement)) || null;
      // If not found, try to find explicit data-* wrappers (e.g. data-boolean, data-array-item, data-section, data-schema-card)
      if (!hoverTarget && highlightTarget.closest) {
        try {
          hoverTarget = highlightTarget.closest('[data-boolean], [data-array-item], [data-section], [data-schema-card]') as HTMLElement | null;
        } catch (e) {
          // ignore
          hoverTarget = null;
        }
      }
    } catch (err) {
      hoverTarget = null;
    }
    if (!hoverTarget) hoverTarget = highlightTarget;
    // If we preferred a boolean wrapper, ensure the hover target is that wrapper
    if (preferWrapper && highlightTarget) {
      hoverTarget = highlightTarget;
    }
    hoverTarget.classList.add(hoverClass);

    const t = setTimeout(() => {
      // Remove the highlight class first so the element transitions back
      highlightTarget && highlightTarget.classList.remove(highlightClass);
      // Remove hover class to restore outline
      hoverTarget && hoverTarget.classList.remove(hoverClass);
      removed = true;
      // After transition completes, remove the animatable class as cleanup
      const TRANS_MS = 700; // should match CSS transition duration (ms)
      setTimeout(() => {
        highlightTarget && highlightTarget.classList.remove(animClass);
      }, TRANS_MS);
    }, durationMs);

    return {
      cleanup: () => {
        if (!removed) {
          clearTimeout(t);
          highlightTarget && highlightTarget.classList.remove(highlightClass);
          // also remove hover and animatable (hover may be applied to hoverTarget)
          hoverTarget && hoverTarget.classList.remove('field-nav-hover');
          highlightTarget && highlightTarget.classList.remove('field-nav-animatable');
        }
      }
    };
  }

  return { cleanup: () => {} };
}
