/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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

import { useEffect } from 'react';

/**
 * Custom hook to handle ESC key press events
 * @param handler - Function to call when ESC is pressed
 * @param isActive - Whether the handler should be active (default: true)
 */
export const useEscapeKey = (handler: () => void, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Prevent the event from bubbling up to avoid conflicts
        event.preventDefault();
        event.stopPropagation();
        handler();
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown, true);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handler, isActive]);
};

/**
 * Hook for handling clicks outside dialogs - works with MUI Dialog backdrop clicks
 * This is designed to work with MUI Dialog's onClose prop
 * @param onClose - Function to call when clicking outside
 * @param isOpen - Whether the dialog is currently open
 */
export const useDialogBackdropClose = (onClose: () => void, isOpen: boolean) => {
  // This hook is mainly for consistency - MUI Dialog handles backdrop clicks natively
  // We just ensure the onClose function is properly handled
  return isOpen ? onClose : () => {};
};

/**
 * Hook specifically for dialog components to handle ESC key closing
 * @param onClose - Function to call when dialog should close
 * @param isOpen - Whether the dialog is currently open
 */
export const useEscapeDialog = (onClose: () => void, isOpen: boolean) => {
  useEscapeKey(onClose, isOpen);
};

/**
 * Hook that combines ESC key functionality for dialogs with MUI backdrop support
 * @param onClose - Function to call when dialog should close
 * @param isOpen - Whether the dialog is currently open
 */
export const useDialogControls = (onClose: () => void, isOpen: boolean) => {
  useEscapeKey(onClose, isOpen);
  return onClose; // Return the close handler for MUI Dialog's onClose prop
};

/**
 * Hook for navigation back functionality with ESC key
 * @param navigateBack - Function to call for navigation (usually from useNavigate)
 * @param isActive - Whether navigation should be active (default: true)
 */
export const useEscapeNavigation = (navigateBack: () => void, isActive: boolean = true) => {
  useEscapeKey(navigateBack, isActive);
};