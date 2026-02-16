/**
 * Keyboard Context
 * Manages virtual keyboard state globally across the application
 * Supports both React-controlled inputs and native DOM inputs (e.g., SDK inputs)
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface KeyboardPosition {
  top?: number;
  bottom?: number;
}

interface KeyboardContextType {
  isVisible: boolean;
  inputValue: string;
  keyboardPosition: KeyboardPosition;
  showKeyboard: (input: HTMLInputElement, value: string) => void;
  hideKeyboard: () => void;
  updateValue: (value: string) => void;
}

const KeyboardContext = createContext<KeyboardContextType | null>(null);

// Input types that should NOT trigger the virtual keyboard
const NON_TEXT_INPUT_TYPES = [
  'checkbox',
  'radio',
  'file',
  'submit',
  'button',
  'reset',
  'hidden',
  'image',
  'range',
  'color',
];

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [keyboardPosition, setKeyboardPosition] = useState<KeyboardPosition>({});
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  // Track if there was a recent user interaction (click/touch)
  // This helps distinguish user-initiated focus from programmatic focus
  const recentUserInteractionRef = useRef(false);

  const showKeyboard = useCallback((input: HTMLInputElement, value: string) => {
    activeInputRef.current = input;
    setInputValue(value);

    // Calculate keyboard position based on input location
    try {
      const rect = input.getBoundingClientRect();
      const inputBottom = rect.bottom;
      const viewportHeight = window.innerHeight;

      // Position keyboard below the input with 16px padding
      const keyboardTop = inputBottom + 16;

      // Check if there's enough space below the input (assuming ~300px keyboard height)
      const hasSpaceBelow = (viewportHeight - keyboardTop) > 320;

      if (hasSpaceBelow) {
        // Position below the input
        setKeyboardPosition({ top: keyboardTop });
      } else {
        // Fallback to bottom positioning if not enough space
        setKeyboardPosition({ bottom: 24 });
      }
    } catch (error) {
      // Fallback to bottom positioning on error
      console.warn('Failed to calculate keyboard position:', error);
      setKeyboardPosition({ bottom: 24 });
    }

    setIsVisible(true);
  }, []);

  const hideKeyboard = useCallback(() => {
    setIsVisible(false);
    activeInputRef.current = null;
  }, []);

  const updateValue = useCallback((value: string) => {
    setInputValue(value);
    // Update the actual input element
    if (activeInputRef.current) {
      const input = activeInputRef.current;
      // Use native setter to properly trigger React/SDK change handlers
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  // Track user interactions to distinguish user-initiated focus from programmatic focus
  // This prevents keyboard from showing when SDK auto-focuses inputs (e.g., showNavigation)
  useEffect(() => {
    const markUserInteraction = () => {
      recentUserInteractionRef.current = true;
      // Reset after a short delay - focus events happen immediately after click/touch
      setTimeout(() => {
        recentUserInteractionRef.current = false;
      }, 100);
    };

    // Track clicks and touches as user interactions
    document.addEventListener('mousedown', markUserInteraction, true);
    document.addEventListener('touchstart', markUserInteraction, true);

    return () => {
      document.removeEventListener('mousedown', markUserInteraction, true);
      document.removeEventListener('touchstart', markUserInteraction, true);
    };
  }, []);

  // Global focus listener for all text inputs (including SDK inputs)
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;

      // Handle input elements
      if (target.tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        const inputType = (input.type || 'text').toLowerCase();

        // Skip non-text input types
        if (NON_TEXT_INPUT_TYPES.includes(inputType)) {
          return;
        }

        // Skip inputs explicitly marked to not show keyboard
        if (input.dataset.keyboardDisabled === 'true') {
          return;
        }

        // Only show keyboard if focus was triggered by user interaction (click/touch)
        // This prevents keyboard from appearing on programmatic focus (e.g., SDK showNavigation)
        if (!recentUserInteractionRef.current) {
          return;
        }

        showKeyboard(input, input.value);
      }
    };

    // Listen for focus events on the document (capture phase to catch SDK inputs)
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [showKeyboard]);

  return (
    <KeyboardContext.Provider
      value={{
        isVisible,
        inputValue,
        keyboardPosition,
        showKeyboard,
        hideKeyboard,
        updateValue,
      }}
    >
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
}

/**
 * Hook to connect a React input field to the virtual keyboard
 */
export function useKeyboardInput(
  inputRef: React.RefObject<HTMLInputElement | null>,
  value: string,
  onChange: (value: string) => void
) {
  const { showKeyboard, isVisible, inputValue } = useKeyboard();
  const lastValueRef = useRef(value);

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      showKeyboard(inputRef.current, value);
    }
  }, [showKeyboard, inputRef, value]);

  // Sync keyboard value changes back to the input's onChange
  useEffect(() => {
    if (isVisible && inputRef.current && inputValue !== lastValueRef.current) {
      lastValueRef.current = inputValue;
      onChange(inputValue);
    }
  }, [isVisible, inputRef, inputValue, onChange]);

  // Update lastValueRef when external value changes
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  return { handleFocus };
}
