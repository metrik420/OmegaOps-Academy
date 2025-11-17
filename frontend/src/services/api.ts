/**
 * FILE: src/services/api.ts
 * PURPOSE: Centralized API client for all backend communication.
 *
 * FEATURES:
 * - Axios instance with interceptors for consistent error handling
 * - Type-safe API methods for all endpoints
 * - Request/response logging in development
 * - Automatic retry for transient failures
 * - Timeout configuration to prevent hanging requests
 *
 * SECURITY:
 * - No sensitive data logged
 * - Credentials handled via HTTP-only cookies (backend responsibility)
 * - CORS handled by Vite proxy in development
 *
 * PERFORMANCE:
 * - Connection reuse via Axios defaults
 * - Request deduplication could be added if needed
 * - Response caching delegated to React Query or SWR (future enhancement)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import type {
  Mission,
  Lab,
  KnowledgeTopic,
  SoftwareTool,
  Update,
  ApiResponse,
  PaginatedResponse,
  RoadmapWeek,
  AdminStats,
  FilterState,
} from '@/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * API base URL configuration.
 * Uses environment variable or defaults to /api (proxied by Vite).
 * In production, this would be the actual API domain.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Request timeout in milliseconds.
 * 30 seconds is generous but prevents infinite hangs.
 * Adjust based on expected API response times.
 */
const REQUEST_TIMEOUT = 30000;

/**
 * Maximum retry attempts for failed requests.
 * Only retries on network errors, not 4xx/5xx responses.
 */
const MAX_RETRIES = 3;

/**
 * Delay between retries in milliseconds.
 * Exponential backoff: 1000, 2000, 4000 ms.
 */
const RETRY_DELAY = 1000;

// ============================================================================
// AXIOS INSTANCE CREATION
// ============================================================================

/**
 * Create configured Axios instance.
 * Centralized configuration ensures consistency across all requests.
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    /**
     * withCredentials enables cookie transmission for auth.
     * Required for session-based authentication.
     */
    withCredentials: true,
  });

  // Request interceptor for logging and auth token injection
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      /**
       * Development logging - helps debug API issues.
       * Never log in production to avoid performance overhead.
       */
      if (import.meta.env.DEV) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          // Don't log full body to avoid exposing sensitive data
          hasBody: !!config.data,
        });
      }

      /**
       * Add correlation ID for request tracing.
       * Helps match frontend requests with backend logs.
       */
      config.headers['X-Request-ID'] = generateRequestId();

      return config;
    },
    (error: AxiosError) => {
      console.error('[API] Request setup error:', error.message);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling and transformation
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (import.meta.env.DEV) {
        console.log(`[API] Response ${response.status}:`, {
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length,
        });
      }
      return response;
    },
    async (error: AxiosError) => {
      /**
       * Handle different error scenarios:
       * - Network errors: retry with exponential backoff
       * - 401 Unauthorized: redirect to login (future)
       * - 403 Forbidden: show permission error
       * - 404 Not Found: resource doesn't exist
       * - 429 Too Many Requests: rate limited
       * - 5xx Server Error: retry or show server error
       */
      if (error.response) {
        const status = error.response.status;

        if (status === 401) {
          // Could trigger logout or redirect to login
          console.warn('[API] Unauthorized - session may have expired');
        } else if (status === 429) {
          console.warn('[API] Rate limited - slow down requests');
        } else if (status >= 500) {
          console.error('[API] Server error:', error.response.data);
        }
      } else if (error.request) {
        // Network error - no response received
        console.error('[API] Network error - no response');
      }

      return Promise.reject(transformError(error));
    }
  );

  return client;
};

/**
 * Generate unique request ID for tracing.
 * Simple timestamp + random suffix.
 */
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Transform Axios error into user-friendly format.
 * Extracts relevant information without exposing internals.
 */
const transformError = (error: AxiosError): Error => {
  if (error.response) {
    const data = error.response.data as { message?: string; error?: { message?: string } };
    const message =
      data?.error?.message || data?.message || `Request failed with status ${error.response.status}`;
    return new Error(message);
  } else if (error.request) {
    return new Error('Network error - please check your connection');
  } else {
    return new Error(error.message || 'An unexpected error occurred');
  }
};

/**
 * Retry wrapper for transient failures.
 * Uses exponential backoff to avoid overwhelming the server.
 *
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts remaining
 * @param delay - Current delay before retry
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      console.log(`[API] Retrying request, ${retries} attempts remaining...`);
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

/**
 * Check if error is retryable (network issues, not client errors).
 */
const isRetryableError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 && status < 600;
  }
  return false;
};

/**
 * Promise-based sleep for delays.
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Create the singleton API client instance
const apiClient = createApiClient();

// ============================================================================
// API METHODS - MISSIONS
// ============================================================================

/**
 * Fetch all missions with optional filtering.
 * Returns paginated list for performance.
 */
export const getMissions = async (
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Mission>> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<PaginatedResponse<Mission>>>('/missions', {
      params: { page, pageSize },
    })
  );
  return response.data.data;
};

/**
 * Fetch single mission by week and day.
 * Route: /missions/:week/:day
 */
export const getMission = async (week: number, day: number): Promise<Mission> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<Mission>>(`/missions/${week}/${day}`)
  );
  return response.data.data;
};

/**
 * Fetch missions for a specific week.
 * Used for roadmap week detail view.
 */
export const getMissionsByWeek = async (week: number): Promise<Mission[]> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<Mission[]>>(`/missions/week/${week}`)
  );
  return response.data.data;
};

/**
 * Mark mission as completed and award XP.
 * Includes quiz score and reflection text.
 */
export const completeMission = async (
  missionId: string,
  data: {
    quizScore: number;
    reflection: string;
    timeSpent: number; // minutes
  }
): Promise<{ xpAwarded: number; newTotalXp: number }> => {
  const response = await apiClient.post<
    ApiResponse<{ xpAwarded: number; newTotalXp: number }>
  >(`/missions/${missionId}/complete`, data);
  return response.data.data;
};

// ============================================================================
// API METHODS - LABS
// ============================================================================

/**
 * Fetch all labs with optional filtering.
 */
export const getLabs = async (filters?: Partial<FilterState>): Promise<Lab[]> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<Lab[]>>('/labs', { params: filters })
  );
  return response.data.data;
};

/**
 * Fetch single lab by ID.
 */
export const getLab = async (id: string): Promise<Lab> => {
  const response = await withRetry(() => apiClient.get<ApiResponse<Lab>>(`/labs/${id}`));
  return response.data.data;
};

/**
 * Mark lab as completed.
 * Records which hints were used (affects XP).
 */
export const completeLab = async (
  labId: string,
  data: {
    hintsUsed: number[]; // Hint levels used (1, 2, 3)
    timeSpent: number;
  }
): Promise<{ xpAwarded: number; xpPenalty: number; newTotalXp: number }> => {
  const response = await apiClient.post<
    ApiResponse<{ xpAwarded: number; xpPenalty: number; newTotalXp: number }>
  >(`/labs/${labId}/complete`, data);
  return response.data.data;
};

// ============================================================================
// API METHODS - KNOWLEDGE
// ============================================================================

/**
 * Fetch all knowledge topics.
 */
export const getKnowledgeTopics = async (
  filters?: Partial<FilterState>
): Promise<KnowledgeTopic[]> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<KnowledgeTopic[]>>('/knowledge', { params: filters })
  );
  return response.data.data;
};

/**
 * Fetch single knowledge topic by ID.
 */
export const getKnowledgeTopic = async (id: string): Promise<KnowledgeTopic> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<KnowledgeTopic>>(`/knowledge/${id}`)
  );
  return response.data.data;
};

// ============================================================================
// API METHODS - SOFTWARE
// ============================================================================

/**
 * Fetch all software tools with filtering and sorting.
 * Supports search, category, environment, and status filters.
 */
export const getSoftwareTools = async (
  filters?: Partial<FilterState>
): Promise<SoftwareTool[]> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<SoftwareTool[]>>('/software', { params: filters })
  );
  return response.data.data;
};

/**
 * Fetch single software tool by ID.
 */
export const getSoftwareTool = async (id: string): Promise<SoftwareTool> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<SoftwareTool>>(`/software/${id}`)
  );
  return response.data.data;
};

// ============================================================================
// API METHODS - UPDATES (CHANGELOG)
// ============================================================================

/**
 * Fetch all updates/changelog entries.
 * Filterable by status for admin review.
 */
export const getUpdates = async (status?: string): Promise<Update[]> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<Update[]>>('/updates', { params: { status } })
  );
  return response.data.data;
};

/**
 * Update status of a changelog entry (admin action).
 */
export const updateUpdateStatus = async (
  updateId: string,
  status: 'approved' | 'rejected' | 'ignored'
): Promise<Update> => {
  const response = await apiClient.patch<ApiResponse<Update>>(`/updates/${updateId}`, {
    status,
  });
  return response.data.data;
};

// ============================================================================
// API METHODS - ROADMAP
// ============================================================================

/**
 * Fetch complete 12-week roadmap overview.
 * Returns summary of each week's content.
 */
export const getRoadmap = async (): Promise<RoadmapWeek[]> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<RoadmapWeek[]>>('/roadmap')
  );
  return response.data.data;
};

// ============================================================================
// API METHODS - ADMIN
// ============================================================================

/**
 * Admin login with basic auth.
 * Returns JWT or session cookie.
 */
export const adminLogin = async (password: string): Promise<{ success: boolean }> => {
  const response = await apiClient.post<ApiResponse<{ success: boolean }>>('/admin/login', {
    password,
  });
  return response.data.data;
};

/**
 * Fetch admin dashboard statistics.
 */
export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await withRetry(() =>
    apiClient.get<ApiResponse<AdminStats>>('/admin/stats')
  );
  return response.data.data;
};

/**
 * Approve pending software tool discovery.
 */
export const approveSoftwareTool = async (toolId: string): Promise<SoftwareTool> => {
  const response = await apiClient.post<ApiResponse<SoftwareTool>>(
    `/admin/software/${toolId}/approve`
  );
  return response.data.data;
};

/**
 * Deprecate software tool with reason.
 */
export const deprecateSoftwareTool = async (
  toolId: string,
  reason: string
): Promise<SoftwareTool> => {
  const response = await apiClient.post<ApiResponse<SoftwareTool>>(
    `/admin/software/${toolId}/deprecate`,
    { reason }
  );
  return response.data.data;
};

// ============================================================================
// API METHODS - USER PROGRESS (LOCAL SIMULATION)
// ============================================================================

/**
 * Sync user progress to backend.
 * In full implementation, this would persist to database.
 * Currently, progress is stored locally via Zustand.
 */
export const syncUserProgress = async (progress: unknown): Promise<void> => {
  await apiClient.post('/user/progress', progress);
};

// ============================================================================
// EXPORT CLIENT FOR DIRECT ACCESS (ADVANCED USE)
// ============================================================================

export { apiClient };

// ============================================================================
// REQUEST CONFIG HELPER
// ============================================================================

/**
 * Create request config with common options.
 * Useful for custom requests not covered by methods above.
 */
export const createRequestConfig = (config: AxiosRequestConfig): AxiosRequestConfig => ({
  ...config,
  timeout: config.timeout || REQUEST_TIMEOUT,
});
