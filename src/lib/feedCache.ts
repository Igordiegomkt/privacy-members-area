import { GlobalFeedItem } from '../lib/feedGlobal';
import { MediaItemWithAccess } from '../lib/models';

type GlobalFeedCache = {
  items: GlobalFeedItem[];
  hasMore: boolean;
  lastPage: number;
};

type ModelFeedCache = {
  [modelId: string]: {
    items: MediaItemWithAccess[];
    hasMore: boolean;
    lastPage: number;
  };
};

export const feedCache = {
  global: null as GlobalFeedCache | null,
  model: {} as ModelFeedCache,
};