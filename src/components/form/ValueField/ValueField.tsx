import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import cx from 'classnames';
import { useColorScheme } from '@showdex/components/app';
import { BaseTextField } from '@showdex/components/form';
import type { BaseTextFieldProps } from '@showdex/components/form';
import styles from './ValueField.module.scss';

export interface ValueFieldProps extends BaseTextFieldProps<number> {
  className?: string;
  style?: React.CSSProperties;

  /**
   * Fallback value for when the input is blurred with an empty string.
   *
   * * Also used as the fallback value for the internal `inputValue` state,
   *   should `input.value` be falsy upon initial mount.
   * * If not provided (default), the input value will be set to the last valid value,
   *   which is stored in the `input.value` prop.
   *
   * @since 0.1.3
   */
  fallbackValue?: number;

  /**
   * Kinda like the native `step` prop, but for when the user is holding down the `SHIFT` key.
   *
   * * If unspecified (default), this behavior will be disabled.
   *
   * @since 0.1.3
   */
  shiftStep?: number;

  /**
   * Whether to loop to the `max` value when `min` is reached.
   *
   * * As implied, `min` and `max` props are required for this to work.
   *
   * @default false
   * @since 0.1.3
   */
  loop?: boolean;

  /**
   * Whether to use an absolutely-positioned pseudo-element
   * for indicating the input's hover/active state.
   *
   * * If `true`, padding and hover/active states are applied to the pseudo-element.
   * * If `false` (default), padding and hover/active states are applied to the container.
   *
   * @default false
   * @since 0.1.0
   */
  absoluteHover?: boolean;
}

/* eslint-disable @typescript-eslint/indent -- this rule is broken af. see Issue #1824 in the typescript-eslint GitHub repo. */
/* eslint-disable react/prop-types */

export const ValueField = React.forwardRef<HTMLInputElement, ValueFieldProps>(({
  className,
  style,
  inputClassName,
  fallbackValue,
  min,
  max,
  step = 1,
  shiftStep,
  loop,
  absoluteHover,
  input,
  disabled,
  ...props
}: ValueFieldProps, forwardedRef): JSX.Element => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(
    forwardedRef,
    () => inputRef.current,
  );

  // grab the color scheme for applying the theme
  const colorScheme = useColorScheme();

  // although react-final-form has meta.active,
  // we're keeping track of the focus state ourselves in case we don't wrap this in a Field
  // (i.e., we're not using react-final-form, but rather, rendering ValueField directly)
  const [active, setActive] = React.useState<boolean>(false);

  // this is only a visual value, so that we don't forcibly change the user's value as they're typing it
  const [inputValue, setInputValue] = React.useState<string>(
    input?.value?.toString()
      || fallbackValue?.toString(),
  );

  // type number fields don't do a good job preventing users from typing in non-numeric characters
  // (like '.' and 'e') nor does it enforce the `min` and `max` values if typed in manually.
  // hence, we use a regular 'ol type text field and control the value ourselves. yay!
  const handleChange = React.useCallback((value: string | number) => {
    let strValue = String(value);

    // show empty strings in the input field, but don't update final-form's value
    if (!strValue) {
      setInputValue('');

      return;
    }

    // remove a manually entered-in minus if min is specified and non-negative
    if (strValue === '-' && typeof min === 'number' && min >= 0) {
      strValue = '';
    }

    // remove any non-numeric characters
    // (except for the leading negative, if present at this point)
    strValue = strValue.replace(/(?!^-)[^\d]/g, '');

    // again, at this point, if we have an empty string, show it, but don't let final-form know
    if (!strValue) {
      setInputValue('');

      return;
    }

    // convert the strValue to a number and clamp it if min/max props are specified
    // (and if all hell breaks loose during this conversion [i.e., NaN], default to 0)
    let numValue = Number(strValue) || 0;

    if (typeof min === 'number') {
      numValue = loop && typeof max === 'number' && max > min && numValue < min
        ? max
        : Math.max(min, numValue);
    }

    if (typeof max === 'number') {
      numValue = loop && typeof min === 'number' && min < max && numValue > max
        ? min
        : Math.min(numValue, max);
    }

    // finally, update the visual value and let final-form know
    setInputValue(numValue.toString());
    input?.onChange?.(numValue);
  }, [
    input,
    loop,
    max,
    min,
  ]);

  const handleBlur = React.useCallback((e?: React.FocusEvent<HTMLInputElement>) => {
    const strValue = (e?.target?.value || fallbackValue)?.toString();

    if (typeof strValue === 'string' && strValue !== inputValue) {
      handleChange(strValue);
    }

    setActive(false);
    input?.onBlur?.(e);
  }, [
    fallbackValue,
    handleChange,
    input,
    inputValue,
  ]);

  // since we're not using a type number input cause it sucks ass,
  // emulate the keyboard controls that it natively provides
  const hotkeysRef = useHotkeys<HTMLInputElement>([
    typeof step === 'number' && 'up',
    typeof shiftStep === 'number' && 'shift+up',
    typeof step === 'number' && 'down',
    typeof shiftStep === 'number' && 'shift+down',
    'esc',
    'enter',
  ].filter(Boolean).join(', '), (_, handler) => {
    const currentValue = Number(input?.value ?? inputValue) || 0;

    switch (handler.key) {
      case 'up': {
        handleChange(currentValue + Math.abs(step));

        break;
      }

      case 'shift+up': {
        handleChange(currentValue + Math.abs(shiftStep));

        break;
      }

      case 'down': {
        handleChange(currentValue - Math.abs(step));

        break;
      }

      case 'shift+down': {
        handleChange(currentValue - Math.abs(shiftStep));

        break;
      }

      case 'esc':
      case 'enter': {
        // this will also invoke handleBlur() since the input's onBlur() will fire
        inputRef.current?.blur?.();

        break;
      }

      default: {
        break;
      }
    }
  }, {
    enabled: !disabled,
    enableOnTags: active ? ['INPUT'] : undefined,
  }, [
    active,
    input?.value,
    inputValue,
    step,
    shiftStep,
  ]);

  React.useImperativeHandle(
    hotkeysRef,
    () => inputRef.current,
  );

  // handle updates in final-form's input.value
  React.useEffect(() => {
    const value = input?.value?.toString();

    if (active || !value || value === inputValue) {
      return;
    }

    setInputValue(value);
  }, [
    active,
    input?.value,
    inputValue,
  ]);

  return (
    <div
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        absoluteHover && styles.absoluteHover,
        active && styles.active,
        disabled && styles.disabled,
        className,
      )}
      style={style}
    >
      <BaseTextField
        ref={inputRef}
        {...props}
        inputClassName={cx(
          styles.input,
          inputClassName,
        )}
        input={{
          // type: 'number',
          value: inputValue,
          onChange: handleChange,
          onFocus: (e?: React.FocusEvent<HTMLInputElement>) => {
            setActive(true);
            input?.onFocus?.(e);
          },
          onBlur: handleBlur,
        }}
        disabled={disabled}
      />
    </div>
  );
});

/* eslint-enable react/prop-types */
/* eslint-enable @typescript-eslint/indent */
