import * as Sentry from "@sentry/react";

export type FeatureFlags = {
  UNBORKED_V2: boolean; // Enables the new version of the Unborked application interface and functionality
  EXPERIMENTAL_CHECKOUT: boolean; // Enables the experimental checkout flow with enhanced UX and analytics
  DARK_MODE: boolean; // Activates dark mode across the entire application interface
  ADVANCED_FILTERING: boolean; // Enables advanced product filtering and sorting options in the catalog
  STOREQUERY_V2: boolean; // Enables the V2 product query endpoint
  GOODS_PRODUCTQUERY: boolean; // Enables the new goods product query endpoint
  CARTAPI_V2: boolean; // Enables saving cart to database via API V2
  [key: string]: boolean;
};

export type FlagValue = string | number | boolean;
export type FlagMap = Record<string, FlagValue>;

// This will hold the defaults fetched from the server
let serverDefaultFlags: FeatureFlags = {} as FeatureFlags;

// Flags for the Sentry Toolbar - only need to fetch once on initial load
let initialFlagsForToolbar: FlagMap | null = null;

// HARD-STOP SINGLETON - Stops all repeated calls
let GLOBAL_FLAG_MAP: FlagMap = {
  UNBORKED_V2: false,
  EXPERIMENTAL_CHECKOUT: false,
  DARK_MODE: false,
  ADVANCED_FILTERING: false,
  STOREQUERY_V2: false,
  GOODS_PRODUCTQUERY: false,
  CARTAPI_V2: false
};
let IS_INITIALIZED = false;
let INITIALIZATION_PROMISE: Promise<FlagMap> | null = null;
let LOG_COUNT = 0;
const MAX_LOGS = 5;

const LOCALSTORAGE_KEY = 'unborked-flag-overrides';
const API_ENDPOINT = 'http://localhost:3001/api/flags';

// Global count for adapter calls - persists across all adapter instances
let ADAPTER_CALL_COUNT = 0;
// The single instance of the adapter that will be reused
let ADAPTER_INSTANCE: ReturnType<typeof createFeatureFlagAdapter> | null = null;

// --- Simplified function to fetch defaults from server ---
export async function fetchServerDefaults(): Promise<FeatureFlags> {
  // Only log on localhost for development
  const isLocalhost = window.location.hostname === 'localhost';
  
  // Only fetch if we don't have defaults yet
  if (Object.keys(serverDefaultFlags).length > 0) {
    if (isLocalhost && LOG_COUNT < MAX_LOGS) {
      console.log("Using already fetched server default flags");
      LOG_COUNT++;
    }
    return serverDefaultFlags;
  }
  
  try {
    if (isLocalhost) console.log("Fetching initial defaults from /api/flags...");
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch flags: ${response.statusText}`);
    }
    serverDefaultFlags = await response.json();
    if (isLocalhost) console.log("Fetched server default flags:", serverDefaultFlags);
    return serverDefaultFlags;
  } catch (error) {
    console.error("Error fetching server default flags, returning last known or empty:", error);
    return serverDefaultFlags;
  }
}

// Local storage functions for dev toolbar overrides
export function getLocalStorage(): FlagMap {
  try {
    return JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function setLocalStorage(overrides: FlagMap) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(overrides));
  } catch {
    return;
  }
}

export function clearLocalStorage() {
  localStorage.setItem(LOCALSTORAGE_KEY, '{}');
}

export const getFlagsIntegration = () => {
  return Sentry.getClient()?.getIntegrationByName<Sentry.FeatureFlagsIntegration>(
    "FeatureFlags"
  );
};

// --- Simplified setFeatureFlag: Only updates Sentry context ---
export const setFeatureFlag = (flagName: string, value: boolean) => {
  const flagsIntegration = getFlagsIntegration();
  if (flagsIntegration) {
    flagsIntegration.addFeatureFlag(flagName, value);
  } else {
    console.warn("Feature flags integration not available");
  }
};

// Get the caller of a function for debugging
function getCallerInfo() {
  const error = new Error();
  const stack = error.stack || '';
  const callerLine = stack.split('\n')[3]; // 0 is Error, 1 is getCallerInfo, 2 is getCurrentFlagMap, 3 is the caller
  return callerLine?.trim() || 'Unknown caller';
}

// --- Get current feature flags map (ASYNC) - STRICT SINGLETON ---
export async function getCurrentFlagMap(): Promise<FlagMap> {
  const isLocalhost = window.location.hostname === 'localhost';
  
  // If already initialized, just return the global flags immediately
  if (IS_INITIALIZED) {
    return GLOBAL_FLAG_MAP;
  }
  
  // If we're in the process of initializing, return the promise
  if (INITIALIZATION_PROMISE) {
    if (isLocalhost && LOG_COUNT < MAX_LOGS) {
      const caller = getCallerInfo();
      console.log(`🛑 Attempt to call getCurrentFlagMap while initialization in progress. Caller: ${caller}`);
      LOG_COUNT++;
    }
    return INITIALIZATION_PROMISE;
  }
  
  // First-time initialization
  if (isLocalhost) console.log("🔍 Initializing feature flags (first and only time)");
  
  // Create initialization promise
  INITIALIZATION_PROMISE = (async () => {
    try {
      // 1. Fetch server defaults
      let defaults: FeatureFlags;
      if (Object.keys(serverDefaultFlags).length > 0) {
        defaults = serverDefaultFlags;
      } else {
        defaults = await fetchServerDefaults();
      }
      
      // 2. Get localStorage overrides
      const localOverrides = getLocalStorage();

      // 3. Get URL query parameter overrides
      const urlParams = new URLSearchParams(window.location.search);
      const urlOverrides: FlagMap = {};
      // Iterate over known flags or all keys in defaults
      Object.keys(defaults).forEach(flagName => {
          const paramValue = urlParams.get(flagName); // Case sensitive match for now
          if (paramValue !== null) {
              // Interpret 'true'/'1' as true, others as false
              urlOverrides[flagName] = paramValue.toLowerCase() === 'true' || paramValue === '1';
              if (isLocalhost && LOG_COUNT < MAX_LOGS) {
                console.log(`URL override found: ${flagName}=${urlOverrides[flagName]}`);
                LOG_COUNT++;
              }
          }
      });
      // Also check the specific new flag if not in defaults yet
      const goodsQueryParam = urlParams.get('GOODS_PRODUCTQUERY');
      if (goodsQueryParam !== null && !urlOverrides.hasOwnProperty('GOODS_PRODUCTQUERY')) {
          urlOverrides['GOODS_PRODUCTQUERY'] = goodsQueryParam.toLowerCase() === 'true' || goodsQueryParam === '1';
          if (isLocalhost && LOG_COUNT < MAX_LOGS) {
            console.log(`URL override found: GOODS_PRODUCTQUERY=${urlOverrides['GOODS_PRODUCTQUERY']}`);
            LOG_COUNT++;
          }
      }
      
      // 4. Merge them (URL > LocalStorage > Defaults)
      const mergedFlags = {
        ...defaults,
        ...localOverrides,
        ...urlOverrides, // URL overrides take highest precedence
      };
      
      // Store for toolbar
      initialFlagsForToolbar = { ...mergedFlags };
      
      // Set the global flag map
      GLOBAL_FLAG_MAP = mergedFlags;
      
      // Mark as initialized
      IS_INITIALIZED = true;
      
      if (isLocalhost) console.log("✅ Feature flags initialized successfully (with URL overrides):", GLOBAL_FLAG_MAP);
      
      return GLOBAL_FLAG_MAP;
    } catch (error) {
      console.error("❌ Error initializing feature flags:", error);
      // Even on error, mark as initialized to prevent further API calls
      IS_INITIALIZED = true;
      return GLOBAL_FLAG_MAP;
    }
  })();
  
  return INITIALIZATION_PROMISE;
}

// Update the flag map directly without re-fetching
export function updateFlag(flagName: string, value: boolean): void {
  GLOBAL_FLAG_MAP[flagName] = value;
  
  // Also update toolbar flags if they exist
  if (initialFlagsForToolbar) {
    initialFlagsForToolbar[flagName] = value;
  }
}

// Function to update Sentry context with current flag values
export const updateSentryFlags = (flags: FlagMap) => {
  const flagsIntegration = getFlagsIntegration();
  
  if (flagsIntegration) {
    // Update flags by removing and re-adding them
    Object.entries(flags).forEach(([flag, value]) => {
      flagsIntegration.addFeatureFlag(flag, Boolean(value));
    });
  }
};

// Internal function to create the adapter
function createFeatureFlagAdapter() {
  return {
    // Get flags for the toolbar
    async getFlagMap(): Promise<FlagMap> {
      const isLocalhost = window.location.hostname === 'localhost';
      
      // Log the first few calls - using global counter
      if (isLocalhost && ADAPTER_CALL_COUNT < 5) {
        console.log(`⚙️ FeatureFlagAdapter.getFlagMap called (${++ADAPTER_CALL_COUNT})`);
      }
      
      // If flags are initialized, use the global map + any new overrides
      if (IS_INITIALIZED) {
        const overrides = getLocalStorage();
        return {
          ...GLOBAL_FLAG_MAP,
          ...overrides
        };
      }
      
      // If toolbar flags exist, use those
      if (initialFlagsForToolbar) {
        const overrides = getLocalStorage();
        return {
          ...initialFlagsForToolbar,
          ...overrides
        };
      }
      
      // If we need to initialize, do it and return the result
      // This should rarely happen since main.tsx should initialize flags before toolbar loads
      try {
        return await getCurrentFlagMap();
      } catch (error) {
        console.error("Error getting flags for toolbar:", error);
        return GLOBAL_FLAG_MAP;
      }
    },
    
    getOverrides(): Promise<FlagMap> {
      return Promise.resolve(getLocalStorage());
    },
    
    // setOverride: ONLY UPDATES LOCALLY, NOT DATABASE
    async setOverride(name: string, override: FlagValue | undefined) {
      const isLocalhost = window.location.hostname === 'localhost';
      if (isLocalhost) console.log(`🏷️ DEV TOOLBAR: Setting local-only override for ${name}=${override}`);
      
      // Get current overrides from localStorage
      const overridesPrev = getLocalStorage();
      
      // Update localStorage with new override
      const updatedOverrides: FlagMap = { ...overridesPrev };
      const newBooleanValue = Boolean(override);

      if (override !== undefined) {
        updatedOverrides[name] = newBooleanValue;
      } else {
        // If override is undefined, it means we are clearing this specific override
        delete updatedOverrides[name];
      }
      
      // Save to localStorage
      setLocalStorage(updatedOverrides);

      // Update Sentry context for the toolbar UI
      setFeatureFlag(name, newBooleanValue);
      
      // Update global flag map directly
      updateFlag(name, newBooleanValue);
      
      // Dispatch storage event for the FeatureFlagsContext to detect
      window.dispatchEvent(new StorageEvent('storage', {
        key: LOCALSTORAGE_KEY,
        newValue: JSON.stringify(updatedOverrides),
        oldValue: JSON.stringify(overridesPrev)
      }));
      
      // Also dispatch our custom event for immediate response
      window.dispatchEvent(new CustomEvent('flag-value-changed', {
        detail: { flagName: name, value: newBooleanValue }
      }));
    },
    
    // Clear all overrides
    async clearOverrides() {
      // Get current overrides before clearing
      const overridesPrev = getLocalStorage();
      
      // Clear localStorage
      clearLocalStorage();
      
      // Reset to server defaults
      try {
        const defaults = await fetchServerDefaults();
        
        Object.entries(defaults).forEach(([flag, value]) => {
          const boolValue = Boolean(value);
          
          // Update Sentry
          setFeatureFlag(flag, boolValue);
          
          // Update global flag map
          updateFlag(flag, boolValue);
          
          // Dispatch event
          window.dispatchEvent(new CustomEvent('flag-value-changed', {
            detail: { flagName: flag, value: boolValue }
          }));
        });
        
        // Dispatch storage event
        window.dispatchEvent(new StorageEvent('storage', {
          key: LOCALSTORAGE_KEY,
          newValue: '{}',
          oldValue: JSON.stringify(overridesPrev)
        }));
        
      } catch (error) {
        console.error("Error clearing overrides:", error);
      }
    },
  };
}

// --- Create Sentry Toolbar Feature Flag Adapter (TRUE SINGLETON) ---
export function FeatureFlagAdapter() {
  // If an instance already exists, return it
  if (ADAPTER_INSTANCE) {
    return ADAPTER_INSTANCE;
  }
  
  // Create a new instance only if one doesn't exist
  ADAPTER_INSTANCE = createFeatureFlagAdapter();
  return ADAPTER_INSTANCE;
}