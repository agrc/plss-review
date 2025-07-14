import { logger } from 'firebase-functions/v2';
import ky from 'ky';

const serviceUrl = process.env.GCLOUD_PROJECT?.includes('prod')
  ? 'https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/PLSS_Monuments/FeatureServer/0'
  : 'https://services1.arcgis.com/99lidPhWCzftIe9K/ArcGIS/rest/services/TEST_PLSS_Monuments/FeatureServer/0';

export const calculateFeatureUpdates = (
  corner: string | undefined,
  mrrc: boolean | undefined,
  attributes: { point_category: string; mrrc: number | null; monument: number | null },
) => {
  const updates: Record<string, string | number> = {};
  const referenceCorners = ['WC', 'MC', 'RC', 'Other'];
  const isReferenceCorner = corner ? referenceCorners.includes(corner) : false;

  if (attributes.point_category === 'Calculated' && isReferenceCorner) {
    updates.point_category = 'Reference Corner';
  } else if (attributes.point_category !== 'Monument Record' && !isReferenceCorner && corner !== undefined) {
    updates.point_category = 'Monument Record';
  }

  if (attributes.mrrc !== 1 && mrrc === true) {
    updates.mrrc = 1;
  }

  if (attributes.monument !== 1) {
    if (isReferenceCorner && attributes.monument !== 0) {
      updates.monument = 0;
    } else if (!isReferenceCorner && corner !== undefined) {
      updates.monument = 1;
    }
  }

  return updates;
};

export const getAGOLToken = async () => {
  const password = process.env.AGOL_CREDENTIALS;

  if (!password) {
    throw new Error('AGOL credentials not configured');
  }

  interface TokenResponse {
    token: string;
    expires: number;
    ssl: boolean;
    error?: {
      code: number;
      message: string;
      messageCode: string;
      details?: string[];
    };
  }

  const tokenResponse = await ky
    .post<TokenResponse>('https://www.arcgis.com/sharing/rest/generateToken', {
      body: new URLSearchParams({
        username: 'UtahAGRC',
        password,
        referer: 'https://www.arcgis.com',
        f: 'json',
      }),
    })
    .json();

  const tokenData = tokenResponse;

  // Handle AGOL error responses
  if (tokenData.error) {
    logger.error(`[getAGOLToken] AGOL authentication error`, {
      error: tokenData.error,
    });

    throw new Error(`AGOL authentication error: ${tokenData.error.message} (code: ${tokenData.error.code})`);
  }

  if (!tokenData.token) {
    throw new Error('Failed to authenticate with AGOL - no token received');
  }

  return tokenData.token;
};

export const getAttributesFor = async (blmPointId: string, token: string) => {
  const queryUrl = `${serviceUrl}/query`;
  const searchParams = {
    where: `point_id='${blmPointId}'`,
    outFields: 'OBJECTID,point_category,mrrc,monument',
    returnGeometry: 'false',
    token,
    f: 'json',
  };

  const queryResult = await ky
    .get(queryUrl, {
      searchParams,
    })
    .json<{
      features?: Array<{
        attributes: {
          OBJECTID: number;
          point_category: string;
          mrrc: number;
          monument: number;
        };
      }>;
      error?: {
        code: number;
        message: string;
        messageCode: string;
        details?: string[];
      };
    }>();

  // Handle AGOL error responses
  if (queryResult.error) {
    logger.error(`[getAttributesFor] AGOL API error for BLM Point ${blmPointId}`, {
      error: queryResult.error,
    });

    throw new Error(`AGOL API error: ${queryResult.error.message} (code: ${queryResult.error.code})`);
  }

  if (!queryResult.features || queryResult.features.length === 0) {
    logger.warn(`[publishSubmissions] No feature found for BLM Point ${blmPointId}`);

    return null;
  }

  const feature = queryResult.features[0];
  if (!feature) {
    logger.warn(`[publishSubmissions] Feature data is missing for BLM Point ${blmPointId}`);

    return null;
  }

  const attributes = feature.attributes;

  return {
    id: attributes.OBJECTID,
    point_category: attributes.point_category,
    mrrc: attributes.mrrc,
    monument: attributes.monument,
  };
};

export const updateFeatureService = async (
  features: { attributes: { OBJECTID: number; [key: string]: string | number } }[],
) => {
  if (features.length === 0) {
    logger.info(`[updateFeatureService] No features to update`);

    return [];
  }

  const token = await getAGOLToken();
  const updateUrl = `${serviceUrl}/updateFeatures`;
  const body = new URLSearchParams({
    token,
    features: JSON.stringify(features),
    rollbackOnFailure: 'false', // we can retry failed updates later based on the updateMap
    f: 'json',
  });

  const updateResponse = await ky.post(updateUrl, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  // For now, just log what would be updated
  logger.info(`[updateFeatureService] Preparing to update ${features.length} features`, { features });

  // TODO: Uncomment when ready to actually update features
  const updateResult = (await updateResponse.json()) as {
    updateResults?: { success: boolean; objectId?: number; error?: unknown }[];
    error?: {
      code: number;
      message: string;
      messageCode: string;
      details?: string[];
    };
  };

  // Handle AGOL error responses
  if (updateResult.error) {
    logger.error(`[updateFeatureService] AGOL API error`, {
      error: updateResult.error,
    });

    throw new Error(`AGOL API error: ${updateResult.error.message} (code: ${updateResult.error.code})`);
  }

  if (!updateResult.updateResults) {
    logger.error(`[updateFeatureService] Failed to update features - no updateResults in response`, {
      error: updateResult,
    });

    throw new Error('Failed to update features - no updateResults in response');
  }

  const results = [];
  for (let i = 0; i < updateResult.updateResults.length; i++) {
    const result = updateResult.updateResults[i];
    const feature = features[i];

    if (!feature) {
      logger.error(`[updateFeatureService] Feature at index ${i} is undefined`, updateResult);

      continue;
    }

    if (result?.success === true) {
      logger.info(`[updateFeatureService] Successfully updated feature ${feature.attributes.OBJECTID}`);

      results.push({ success: true, objectId: feature.attributes.OBJECTID });
    } else {
      logger.error(`[updateFeatureService] Failed to update feature ${feature.attributes.OBJECTID}`, results);

      results.push({ success: false, objectId: feature.attributes.OBJECTID, error: result });
    }
  }

  return results;
};
