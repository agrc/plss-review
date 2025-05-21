import { Radio, RadioGroup, TextArea } from '@ugrc/utah-design-system';

export default function RejectionReasons() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <RadioGroup label="Reason">
        <Radio value="missing-photo">Irrelevant or missing photos</Radio>
        <Radio value="sheet-incomplete">Inaccurate or incomplete location information</Radio>
        <Radio value="illegible-scan">Illegible or poorly scanned document</Radio>
        <Radio value="incomplete-description">Incorrect monument description</Radio>
        <Radio value="incomplete-sheet">Missing required fields</Radio>
        <Radio value="other">Other</Radio>
      </RadioGroup>
      <TextArea label="Notes" onChange={() => {}} />
    </div>
  );
}
