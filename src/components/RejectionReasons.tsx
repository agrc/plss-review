import { Radio, RadioGroup, TextArea } from '@ugrc/utah-design-system';
import { Controller, type Control } from 'react-hook-form';
import type { FormValues } from './shared/types';

export function RejectionReasons({ control }: { control: Control<FormValues> }) {
  return (
    <form className="grid grid-cols-1 gap-4">
      <Controller
        control={control}
        name="reason"
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <RadioGroup
            label="Reason"
            errorMessage={fieldState.error?.message}
            isInvalid={fieldState.invalid}
            validationBehavior="aria"
            {...field}
          >
            <Radio value="missing-photo">Irrelevant or missing photos</Radio>
            <Radio value="incomplete-location">Inaccurate or incomplete location information</Radio>
            <Radio value="illegible-scan">Illegible or poorly scanned document</Radio>
            <Radio value="incomplete-description">Incorrect monument description</Radio>
            <Radio value="incomplete-sheet">Missing required fields</Radio>
            <Radio value="other">Other</Radio>
          </RadioGroup>
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextArea
            label="Notes"
            errorMessage={fieldState.error?.message}
            isInvalid={fieldState.invalid}
            validationBehavior="aria"
            {...field}
          />
        )}
      />
    </form>
  );
}
