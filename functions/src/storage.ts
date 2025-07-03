import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import type { BucketFileMigration } from './types.js';

type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

export const generateSheetName = (metadata: {
  referenceCorner: boolean;
  mrrc: boolean;
  blmPointId: string;
  today: Date;
  cornerType?: string;
}): string => {
  let name = metadata.blmPointId;

  // Add corner prefix if it's a reference corner
  if (metadata.referenceCorner) {
    const validCornerTypes = ['WC', 'MC', 'RC'];

    if (metadata.cornerType && validCornerTypes.includes(metadata.cornerType)) {
      name = `${metadata.cornerType}_${name}`;
    }
    // For null, undefined, empty string, or invalid corner types, don't add prefix
  }

  // Add MRRC prefix if mrrc is true
  if (metadata.mrrc === true) {
    name = `MRRC_${name}`;
  }

  const formattedDate = metadata.today
    .toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

  name = `${name}_${formattedDate}`;

  return `tiesheets/${metadata.blmPointId}/${name}.pdf`;
};

export const moveSheetsToFinalLocation = async (bucket: Bucket, data: BucketFileMigration[]) => {
  for (const migration of data) {
    const file = bucket.file(migration.from);
    let destination = bucket.file(migration.to);
    let exists = false;

    try {
      exists = (await destination.exists())[0];
    } catch (error) {
      logger.error(`Error checking file existence: ${error}`);

      throw error;
    }
    //http://localhost:4000/storage/localhost/under-review/UT260030S0060W0_160340/Y0D4o9od4ojHpGaL9gg6uK3dgNuK

    // Add safety measures
    const MAX_ATTEMPTS = 100; // Prevent infinite loops
    let attempts = 0;

    while (exists && attempts < MAX_ATTEMPTS) {
      logger.debug(`[publishSubmissions] Destination file ${migration.to} already exists. Renaming.`);

      migration.to = incrementName(migration.to);
      destination = bucket.file(migration.to);

      try {
        exists = (await destination.exists())[0];
      } catch (error) {
        logger.error(`Error checking file existence: ${error}`);
      }

      attempts++;

      if (attempts >= MAX_ATTEMPTS) {
        throw new Error(`Could not find unique filename after ${MAX_ATTEMPTS} attempts`);
      }
    }

    try {
      await file.move(destination);
      logger.info(`[publishSubmissions] Moved ${migration.from} to ${migration.to}`, { structuredData: true });
    } catch (error) {
      logger.error(`[publishSubmissions] Failed to move file from ${migration.from} to ${migration.to}`, error, {
        structuredData: true,
      });
    }
  }
};

export const incrementName = (name: string): string => {
  // Check if the name ends with .pdf
  name = name.trim();

  if (name.endsWith('.pdf')) {
    // Remove .pdf extension
    const nameWithoutExt = name.slice(0, -4);

    // Check if the name ends with a date pattern like _YYYY-MM-DD
    // This pattern should not be treated as an incrementable number
    const datePattern = /_\d{4}-\d{2}-\d{2}$/;
    const hasDateSuffix = datePattern.test(nameWithoutExt);

    if (hasDateSuffix) {
      // If it ends with a date pattern, just append _1
      return `${nameWithoutExt}_1.pdf`;
    }

    // Look for a pattern that's very likely to be an increment suffix:
    // _<number> where the number doesn't have leading zeros (except for just "0")
    // and the pattern appears at the very end
    const match = nameWithoutExt.match(/^(.+)_(\d+)$/);

    if (match && match[1] && match[2]) {
      const baseName = match[1];
      const numberStr = match[2];
      const number = parseInt(numberStr, 10);

      // Check if this looks like an increment suffix:
      // 1. Single digit numbers (1-9) are likely increments
      // 2. Multi-digit numbers without leading zeros are likely increments
      // 3. Numbers with leading zeros (like "01") are likely part of structured IDs
      const isLikelyIncrement = numberStr === '0' || (numberStr === String(number) && number <= 999);

      if (isLikelyIncrement) {
        return `${baseName}_${number + 1}.pdf`;
      }
    }

    // Add _1 before the .pdf extension
    return `${nameWithoutExt}_1.pdf`;
  } else {
    // For non-PDF files, just append _1
    return `${name}_1`;
  }
};
