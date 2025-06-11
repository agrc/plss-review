import type Graphic from '@arcgis/core/Graphic';
import type { GeoPoint, Timestamp } from 'firebase/firestore';

export type Submission = {
  id: string;
  blmPointId: string;
  county: string;
  submitter: string;
  date: string;
  mrrc?: boolean;
  actions?: string;
};

export type RejectedSubmission = Omit<Submission, 'mrrc' | 'actions'> & {
  rejectedBy: string;
  rejectedFrom: 'User' | 'County' | 'UGRC';
  reason: string;
};

export type ApprovedSubmission = Omit<Submission, 'mrrc' | 'actions'>;

export type Status = {
  approved: boolean | null;
  comments: string | null;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
};

export type Corner = {
  id: string;
  blm_point_id: string;
  county:
    | 'beaver'
    | 'box elder'
    | 'cache'
    | 'carbon'
    | 'daggett'
    | 'davis'
    | 'duchesne'
    | 'emery'
    | 'garfield'
    | 'grand'
    | 'iron'
    | 'juab'
    | 'kane'
    | 'millard'
    | 'morgan'
    | 'piute'
    | 'rich'
    | 'salt lake'
    | 'san juan'
    | 'sanpete'
    | 'sevier'
    | 'summit'
    | 'tooele'
    | 'uintah'
    | 'utah'
    | 'wasatch'
    | 'washington'
    | 'wayne'
    | 'weber';
  created_at: Timestamp;
  datum: 'geographic-nad83' | 'geographic-natrf' | 'grid-nad83' | 'grid-natrf';
  geographic: {
    easting: {
      degrees: number;
      minutes: number;
      seconds: number;
    };
    elevation: number;
    northing: {
      degrees: number;
      minutes: number;
      seconds: number;
    };
    unit: 'ft' | 'm';
  };
  grid: {
    easting: number;
    elevation: number;
    northing: number;
    unit: 'ft' | 'm';
    verticalDatum: 'NAVD88' | 'NGVD29' | 'other';
    zone: 'north' | 'central' | 'south';
  };
  images: {
    closeUp: string;
    extra1: string;
    extra2: string;
    extra3: string;
    extra4: string;
    extra5: string;
    extra6: string;
    extra7: string;
    extra8: string;
    extra9: string;
    extra10: string;
    map: string;
    monument: string;
  };
  location: GeoPoint;
  metadata: {
    accuracy: 'survey' | 'mapping' | 'rec';
    collected: Date;
    corner:
      | 'NW'
      | 'N 1/4'
      | 'NE'
      | 'E 1/4'
      | 'SE'
      | 'S 1/4'
      | 'SW'
      | 'W 1/4'
      | 'Center'
      | '1/16'
      | 'WC'
      | 'RC'
      | 'MC'
      | 'Other';
    description: string;
    mrrc: boolean;
    notes: string;
    section: number;
    status: 'existing' | 'obliterated' | 'lost' | 'original';
  };
  monument: string;
  status: {
    ugrc: Status;
    county: Status;
    sgid: {
      approved: string | null;
    };
    user: {
      cancelled: string | null;
    };
  };
  submitted_by: {
    id: string;
    name: string;
    ref: string;
  };
  type: 'new' | 'existing';
};

export type GraphicOptions = Graphic | Graphic[] | null;

export type FormValues = {
  reason:
    | 'missing-photo'
    | 'incomplete-location'
    | 'illegible-scan'
    | 'incomplete-description'
    | 'incomplete-sheet'
    | 'other';
  notes: string;
};
