import { useState, useCallback } from 'react';

export const useNumberInput = (initialValue: number = 0) => {
  const [value, setValue] = useState<string>(
    initialValue === 0 ? '' : String(initialValue)
  );

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setValue(val);
    }
  }, []);

  const getNumberValue = useCallback(() => {
    return value === '' ? 0 : Number(value);
  }, [value]);

  const reset = useCallback(() => {
    setValue('');
  }, []);

  return {
    value,
    onChange,
    getNumberValue,
    reset,
    setValue,
  };
};